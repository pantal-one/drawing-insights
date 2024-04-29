class ImageConverter {
    // TOOD: メモリ開放
    static gaussianBlur(src, ksize = 15, sigma = 0) {
        let dst = new cv.Mat();
        cv.GaussianBlur(src, dst, new cv.Size(ksize, ksize), sigma, sigma, cv.BORDER_DEFAULT);
        return dst;
    }

    static grayscale(src) {
        let dst = new cv.Mat();
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        cv.cvtColor(dst, dst, cv.COLOR_GRAY2BGRA);
        return dst;
    }

    static quantize(src, mode, n, color) {
        // quantizeのwrapper
        let dst = color ? src.clone() : ImageConverter.grayscale(src);
        dst = ImageConverter._uniformQuantize(dst, n);
        // TODO: kmeansの分岐
        return dst;
    }

    static _uniformQuantize(src, n) {
        // Quantizationの実装
        let dst = new cv.Mat(src.rows, src.cols, src.type());
        const step = 256 / n;
        const offset = step / 2;
        for (let i = 0; i < dst.rows; i++) {
            let srcRow = src.ptr(i);
            let dstRow = dst.ptr(i);
            for (let j = 0; j < dst.cols; j++) {
                for (let c = 0; c < dst.channels(); c++) {
                    let pixelIndex = j * dst.channels() + c;
                    dstRow[pixelIndex] = Math.floor(srcRow[pixelIndex] / step) * step + offset;
                }
            }
        }
        return dst;
    }

    static kMeansQuantize(src, n) {
        // Quantizationの実装
        // 未完成
        const rows = src.rows;
        const cols = src.cols;
        const channels = src.channels();
        let vecData = new cv.Mat(rows * cols, channels, cv.CV_32F);

        // 画像データを1次元に変換
        // OpenCV.jsにはreshapeメソッドがない
        for (let i = 0; i < rows * cols; i++) {
            for (let c = 0; c < channels; c++) {
                vecData.data32F[i * channels + c] = src.data[i * channels + c];
            }
        }
        console.log('reshape complete')
        
        // data.convertTo(data, cv.CV_32F);
        let labels = new cv.Mat();
        let centers = new cv.Mat();
        let creteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER, 100, 0.1);
        cv.kmeans(vecData, n, labels, creteria, 10, cv.KMEANS_RANDOM_CENTERS, centers);
        console.log('kmeans complete', centers);
        
        let dstData = new Uint8ClampedArray(rows * cols * channels);
        for (let i = 0; i < rows * cols; i++) {
            const clusterIdx = labels.data32S[i];
            for (let c = 0; c < channels; c++) {
                // c = (0, 1, 2) -> (R, G, B)
                // vecData[i * channels + c] = centers.data32F[clusterIdx * channels + c]; 
                dstData[i * channels + c] = centers.data32F[clusterIdx * channels + c];
            }
        }

        // どこでどういうデータ型を使えばいいかわかんない
        // let dst = new cv.Mat(rows, cols, cv.CV_8UC3, dstData);
        let dst = new cv.Mat(rows, cols, cv.CV_8UC3);
        dst.data.set(dstData);

        vecData.delete();
        labels.delete();
        centers.delete();
        return dst;
    }

    static whiteout(imgCanvas) {
        let ctx = imgCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, imgCanvas.width, imgCanvas.height);
    }

    static extractEdges(src, ksize, threshold1, threshold2) {
        // 前処理
        let dst = new cv.Mat();
        let M = cv.Mat.ones(3, 3, cv.CV_8U);
        let anchor = new cv.Point(-1, -1);
        cv.GaussianBlur(src, dst, new cv.Size(ksize, ksize), 0, 0, cv.BORDER_DEFAULT);
        cv.dilate(dst, dst, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        cv.morphologyEx(dst, dst, cv.MORPH_OPEN, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        cv.erode(dst, dst, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        // edgeの抽出
        let edges = new cv.Mat();
        cv.Canny(dst, edges, threshold1, threshold2, 3, false);
        cv.bitwise_not(edges, edges);
        cv.cvtColor(edges, edges, cv.COLOR_GRAY2RGBA)
        dst.delete();
        return edges
    }

    static grid(src, rows, cols, gridColor=new cv.Scalar(0, 0, 255, 255)) {
        let dst = src.clone();
        const g = new Grid(src.cols, src.rows, cols, rows);
        // const gridColor = new cv.Scalar(255, 0, 0, 255);  // 画像の種類によっては動かないかも
        for (let r = 1; r < rows; r++) {
            const rect = g.getRect(0, r);
            cv.line(dst, new cv.Point(0, rect.y), new cv.Point(dst.cols, rect.y), gridColor, 1);
        }
        for (let c = 1; c < cols; c++) {
            const rect = g.getRect(c, 0);
            cv.line(dst, new cv.Point(rect.x, 0), new cv.Point(rect.x, dst.rows), gridColor, 1);
        }
        return dst;
    }

    static createTrainingImgs(src, rows, cols, processes) {
        // processesはroi -> roiの関数の列
        // 画像をrows行cols列のグリッドに分割し、各グリッドに一様ランダムにprocessesを適用する。
        let dst = src.clone();
        const g = new Grid(src.cols, src.rows, cols, rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const processNum = Math.floor(Math.random() * processes.length);
                let rect = g.getRect(c, r);
                let roi = new cv.Mat();
                roi = processes[processNum](src.roi(rect));
                roi.copyTo(dst.roi(rect));
            }
        }
        return dst;
    }
}
