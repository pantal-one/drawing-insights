document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        init() {
            setTimeout(() => {
                // Opencv.jsの初期化を待つ。TODO: ちゃんと実装する。
                this.isReady = true;
                console.log('Alpinejs Ready')
            }, 1500);
        },
        destroy() {},
        isReady: false,
        fileUploaded: false,
        activeTab: 'origin',
        fileName: '',
        params: {
            tile: {
                cols: 4,
                rows: 5,
            },
            blur: {
                ksize: 21,
                sigma: 8 //0: auto
            },
            quantize: {
                level: 3,
                color: false,
                mode: ['uniform', 'kmeans'],
                currentMode: 'uniform'
            },
            edge: {
                ksize: 3,
                threshold1: 50,
                threshold2: 150
            }
        },
        tabs: {
            origin: {
                name: 'origin', 
                disp: 'Origin', 
                canvasId: 'originCanvas',
            },
            tile: {
                name: 'tile', 
                disp: 'Tile', 
                canvasId: 'tileCanvas',
            },
            grid: {
                name: 'grid', 
                disp: 'Grid', 
                canvasId: 'gridCanvas',
            },
            blur: {
                name: 'blur', 
                disp: 'Blur', 
                canvasId: 'blurCanvas',
            },
            gray: {
                name: 'gray',
                disp: 'Gray', 
                canvasId: 'grayCanvas',
            },
            quantize: {
                name: 'quantize', 
                disp: 'Quantize', 
                canvasId: 'quantizeCanvas',
            },
            edge: {
                name: 'edge', 
                disp: 'Edge', 
                canvasId: 'edgeCanvas',
            },
            manual: {
                name: 'manual', 
                disp: 'Manual', 
                canvasId: 'manualCanvas',
            },
        },
        changeTab(tabName) {
            this.activeTab = tabName;
        },
        fileChosen(event) {
            const file = event.target.files[0];
            const img = new Image();
            const canvas = document.getElementById('originCanvas');
            const ctx = canvas.getContext('2d');
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.onload = () => {
                        for (const cvs of document.getElementsByTagName('canvas')){
                            cvs.width = img.width;
                            cvs.height = img.height;
                        }
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                        this.fileUploaded = true;
                        this.renderAllCanvas();
                    }
                    img.src = e.target.result;
                }
                reader.readAsDataURL(file);
                this.fileName = file.name;
            }
        },
        downloadCanvas(tabName) {
            if (!this.fileUploaded) {
                return;
            }
            // 現在のタブのcanvasを取得する
            const canvasId = this.tabs[tabName].canvasId
            const canvas = document.getElementById(canvasId);
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = this.downloadFileName(this.fileName, this.activeTab);
            link.click();
        },
        downloadFileName(fileName, tabName) {
            const stem = fileName.replace(/\.[^/.]+$/, '');
            const ext = fileName.split('.').pop();
            return stem + "-" + tabName + "." + ext;
        },
        renderCanvas(tabName) {
            if (!this.isReady) {
                return;
            }
            let src = cv.imread('originCanvas');
            let dst = src.clone();
            switch (tabName) {
                case 'tile':
                    dst = this.applyTile(src);
                    break;
                case 'grid':
                    dst = this.applyGrid(src);
                    break;
                case 'blur':
                    dst = this.applyBlur(src);
                    break;
                case 'gray':
                    dst = this.applyGray(src);
                    break;
                case 'quantize':
                    dst = this.applyQuantize(src);
                    break;
                case 'edge':
                    dst = this.applyEdge(src);
                    break;
            }
            cv.imshow(this.tabs[tabName].canvasId, dst);
            src.delete();
        },
        renderAllCanvas() {
            for (tabName of Object.keys(this.tabs)) {
                this.renderCanvas(tabName);
            }
        },
        applyTile(src) {
            let cols = parseInt(this.params.tile.cols);
            let rows = parseInt(this.params.tile.rows);
            // アロー関数に入れないとparamsにアクセスできない
            const processes = [
                (src) => {return this.applyGray(src)},
                (src) => {return this.applyBlur(src)},
                (src) => {return this.applyQuantize(src)},
                (src) => {return this.applyEdge(src)},
            ]
            return ImageConverter.createTrainingImgs(src, cols, rows, processes)
        },
        applyGrid(src) {
            let cols = parseInt(this.params.tile.cols);
            let rows = parseInt(this.params.tile.rows);
            return ImageConverter.grid(src, cols, rows)
        },
        applyBlur(src) {
            let ksize = parseInt(this.params.blur.ksize);
            let sigma = parseInt(this.params.blur.sigma);
            return ImageConverter.gaussianBlur(src, ksize, sigma);
        },
        applyGray(src) {
            return ImageConverter.grayscale(src)
        },
        applyQuantize(src) {
            let n = parseInt(this.params.quantize.level);
            let color = this.params.quantize.color;
            let mode = this.params.quantize.mode;
            return ImageConverter.quantize(src, mode, n, color)
        },
        applyEdge(src) {
            let ksize = parseInt(this.params.edge.ksize);
            let t1 = parseInt(this.params.edge.threshold1);
            let t2 = parseInt(this.params.edge.threshold2);
            return ImageConverter.extractEdges(src, ksize, t1, t2)
        },
    }))
})