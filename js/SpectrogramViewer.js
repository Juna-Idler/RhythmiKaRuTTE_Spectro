
class WorkerInline extends Worker{
    #ctx = "";

    constructor(src){
        if(!(typeof src === "function" || typeof src === "string")){
            throw new Error("argument must be 'function' or 'string'");
        }

        const ctx = URL.createObjectURL(new Blob([typeof src === "function" ? src.toString().replace(/^.+?\{/s, "").replace(/\}$/s, "") : src]));
        super(ctx);
        this.#ctx = ctx;
    }

    terminate(){
        super.terminate();
        URL.revokeObjectURL(this.#ctx);
    }
}

class SpectrogramViewer
{
    constructor(canvas,audioBuffer,callback,
                zoom = 100,height = 256,
                n = 1024 * 1,rate = 1.5,add = 1.0)
    {
        if (!Number.isInteger(Math.log2(n)))
            return

        let mono;
        if (audioBuffer.numberOfChannels > 1)
        {
            mono = new Float32Array(audioBuffer.length);
            const l = audioBuffer.getChannelData(0);
            const r = audioBuffer.getChannelData(1);
            for (let i = 0; i < audioBuffer.length;i++)
            {
                mono[i] = (l[i] + r[i]) / 2;
            }
        }
        else if (audioBuffer.numberOfChannels > 0)
        {
            mono = audioBuffer.getChannelData(0);
        }

        const width = Math.floor(audioBuffer.duration * zoom);
        const imageData = canvas.getContext('2d').createImageData(width,height);
        this.Zoom = zoom;

        const worker = new WorkerInline(InlineWorker);

        worker.onmessage = (e) => {
            if (e.data.data)
            {
                this.ImageData = e.data;
                callback(-1,0);
            }
            else
            {
                callback(e.data.i,e.data.width);
            }
        };
        const message = {
            imageData:imageData,
            mono: mono,
            zoom: zoom,
            n:n,
            rate:rate,
            add:add,
            frequency:audioBuffer.sampleRate
        };
        worker.postMessage(message,[message.imageData.data.buffer]);
    }

    DrawCanvas(canvas,start_sec)
    {
        if (!this.ImageData)
            return ;
        let start = Math.floor(start_sec * this.Zoom);
        const ctx = canvas.getContext('2d');
       
        ctx.clearRect(0,0,canvas.width,canvas.height);

        ctx.putImageData(this.ImageData, -start,0);
    }
}

function InlineWorker(){
    onmessage = function(e) {

        const imageData = e.data.imageData;
        const mono = e.data.mono;
        const zoom = e.data.zoom;
        const n = e.data.n;
        const rate = e.data.rate;
        const add = e.data.add;
        const frequency = e.data.frequency;
    
        const width = imageData.width;
        const height = imageData.height;
    
    
        const window = new Array(n);
        for (let i = 0; i < n;i++)
        {
            window[i] = Hanning(i,n);
        }
        const max = Math.log10(n / 2);
        const logTable = new Array(n / 2);
        const countTable = new Array(height);
        countTable.fill(0);
        for (let i = 0; i < n / 2;i++)
        {
            logTable[i] = Math.floor(Math.log10(i + 1) / max * (height - 1));
            countTable[logTable[i]]++;
        }
    
        let ar = new Array(n);;
        let ai = new Array(n);
        const tmp = new Array(n/2);
        const volumes = new Array(height);
    
        for (let i = 0; i < width ;i++)
        {
            const start = i * frequency / zoom;
            const slice = mono.slice(start,start + n);
            for (let j = 0;j < n;j++)
            {
                ar[j] = (j < slice.length) ? slice[j] * window[j] : 0;
            }
            ai.fill(0);
            FFT(ar,ai,n,false);
            volumes.fill(0);
            for (let j = 0; j < n / 2;j++)
            {
                const v = Math.log10(Math.sqrt(ar[j] * ar[j] + ai[j] * ai[j])) / rate + add;
                tmp[j] = v;
                volumes[logTable[j]] += v;
            }
            
            for (let j = 0; j < height;j++)
            {
                if (countTable[j] == 0)
                {
                    const index = Math.pow(10,j * max / (height - 1)) - 1;
                    const floor = Math.floor(index);
                    const ceil = Math.ceil(index);
                    volumes[j] = (floor == ceil) ? tmp[index] : tmp[floor] * (ceil - index) + tmp[ceil] * (index - floor);
                }
                else
                    volumes[j] /= countTable[j];
    
                const v = volumes[j];
                imageData.data[(((height -j)*(width*4)) + (i*4)) + 0] = 255 * v;
                imageData.data[(((height -j)*(width*4)) + (i*4)) + 1] = 255 * v;
                imageData.data[(((height -j)*(width*4)) + (i*4)) + 2] = 255 * v;
                imageData.data[(((height -j)*(width*4)) + (i*4)) + 3] = 255;
            }
            postMessage({i:i,width:width});
        }
    
    
        postMessage(imageData,[imageData.data.buffer]);
        close();
      }
    
    function FFT( an, bn, N, Inverse ){
        /////////////////////////////////////////
        //参考：Javaで学ぶシミュレーションの基礎
        /////////////////////////////////////////
        // 入力
        // N  ： 項数（2のべき乗）
        // an : 実数配列（順変換：実数空間データを項数Nで指定、逆変換：展開係数a(n)）
        // bn : 実数配列（順変換：虚数空間データを項数Nで指定、逆変換：展開係数b(n)）
        // Inverse : 逆変換の場合に true
        /////////////////////////////////////////
        // 出力
        // an : 実数配列（順変換：展開係数a(n)、逆変換：実数空間データ）
        // bn : 実数配列（順変換：展開係数b(n)、逆変換：虚数空間データ）
        /////////////////////////////////////////
        const ff = Inverse ? 1 : -1;
        const rot = new Array(N);
        for( let i = 0; i < rot.length; i++ ) rot[ i ] = 0;
        const nhalf = N/2;
        let num = N/2;
        const sc = 2 * Math.PI / N;
        while( num >= 1 ){
            for(let j = 0; j < N; j += 2 * num ){
                const phi = rot[j] / 2;
                const phi0 = phi + nhalf;
                const c = Math.cos( sc * phi );
                const s = Math.sin( sc * phi * ff );
                for( var k = j; k < j + num; k++ ){
                    const k1 = k + num;
                    const a0 = an[ k1 ] * c - bn[ k1 ] *s;
                    const b0 = an[ k1 ] * s + bn[ k1 ] *c;
                    an[ k1 ] = an[ k ] - a0;
                    bn[ k1 ] = bn[ k ] - b0;
                    an[ k ] = an[ k ] + a0;
                    bn[ k ] = bn[ k ] + b0;
                    rot[ k ] = phi;
                    rot[ k1 ] = phi0;
                }
            }
            num = num / 2;
        }
        for( let i = 0; i < N ; i++ ){
            const j = rot[ i ]; 
            if( j > i ){
                let tmp = an[ i ];
                an[ i ] = an[ j ];
                an[ j ] = tmp;
                tmp = bn[ i ];
                bn[ i ] = bn[ j ];
                bn[ j ] = tmp;  
            }
        }
        for( let i = 0; i < N ; i++ ){
            an[ i ] = an[ i ] / Math.sqrt(N);
            bn[ i ] = bn[ i ] / Math.sqrt(N);
        }
    }
    
    function Hanning(n,N)
    {
        return 0.5 - 0.5 * Math.cos( 2* Math.PI * n / (N-1) );
    }
    }