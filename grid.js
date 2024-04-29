class Grid {
    constructor (width, height, cols, rows) {
        // width-x-cols, height-y-rows
        this.width = width;
        this.height = height;
        this.cols = cols;
        this.rows = rows;
        this._colOffset = this._calcOffset(width, cols);
        this._rowOffset = this._calcOffset(height, rows);
    }

    _calcOffset(x, y) {
        // xをできるだけ均等にy個の区間に分割し、区間の始点、終点の列を作る。
        // e.g. (18, 5) -> [0, 4, 8, 12, 15, 18]
        let total = 0;
        let remainder = x % y
        let baseSize = (x - remainder) / y
        return Array.from({length: y + 1}, (_, i) => {
            let start = total;
            total += baseSize + (i < remainder ? 1 : 0);
            return start;
        });
    }

    getRect(c, r) {
        // r行c列目のrectを返す
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
            throw new Error("Rect position is out of range");
        }
        const w = this._colOffset[c + 1] - this._colOffset[c];
        const h = this._rowOffset[r + 1] - this._rowOffset[r];
        return new cv.Rect(this._colOffset[c], this._rowOffset[r], w, h);
    }
}
