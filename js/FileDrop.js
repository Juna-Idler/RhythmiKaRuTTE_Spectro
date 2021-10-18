(function FilesDrop(){
    var droparea = document.createElement("div")
        
    function showDroparea(){
        droparea.style.cssText = "all: initial;\
                                    position: fixed;\
                                    top:0;left:0;\
                                    z-index: 1000;\
                                    width: 100%;\
                                    height: 100%;\
                                    box-sizing: border-box;\
                                    display: block;\
                                    border: 8px dashed #333333;\
                                    background-color:rgba(0,0,0,0.5);"
    }
    
    function hideDroparea(){
        droparea.style.cssText = "all: initial;\
                                    position: fixed;\
                                    top:0;left:0;\
                                    z-index: 1000;\
                                    width: 100%;\
                                    height: 100%;\
                                    box-sizing: border-box;\
                                    display: none;";
    }
    
    droparea.ondragleave = e => {
        e.preventDefault();
        hideDroparea();
    };
    
    window.addEventListener("dragover", e => e.preventDefault(), false)
    window.addEventListener("dragenter", e => {
        e.preventDefault();
        showDroparea();
    }, false);
    window.addEventListener("drop", e => {
        e.preventDefault();
        hideDroparea();

        DropFiles(e.dataTransfer.files);
    }, false);
    
    document.body.appendChild(droparea);
    

    var selectOverlap = document.createElement("div");
    selectOverlap.style.cssText = `all: initial;
        flex-direction: column;
        position: fixed;
        display: none;
        width:100%;
        height:100%;
        top:0;left:0;
        z-index: 1000;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        background-color: #000C;
        `;
    
    var selectArea = document.createElement("div");
    selectOverlap.appendChild(selectArea);
    selectArea.style.cssText = `
    position: relative;
    background-color: #EEEEEE;
    text-align: center;
    padding: 1rem;
    `;
    
    selectArea.innerHTML =`
    <label>FFT Samples N <select id="SpectroSamplesN">
    <option selected>1024</option>
    <option>2048</option>
    <option>4096</option>
    <option>8192</option>
    </select></label><br>
    <label>Zoom(pixels per sec) <select id="SpectroZoom">
    <option>50</option>
    <option selected>100</option>
    <option>200</option>
    <option>300</option>
    </select></label><br>
    <label>Height<select id="SpectroHeight">
    <option>150</option>
    <option>200</option>
    <option selected>250</option>
    <option>300</option>
    </select></label><br>
    <label style="display:none">無音判定倍率<input type="range" id="SpectroDRate" min="1" max="3" value="2." step="0.5"></label><br>
    <label style="display:none">音量ブースト加算値<input type="range" id="SpectroDAdd" min="1" max="1.5" value="1" step="0.25"></label><br>
    <br>
    <button id="SpectroLoad" type="button" >Load</button>
    <button id="SpectroCancel" type="button" >Cancel</button>
    `;
    
    var DropFile = null;
    document.body.appendChild(selectOverlap);
    document.getElementById("SpectroLoad").onclick = (e)=>{
        spectrogramViewer = null;
    
        const ctx = canvas.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = canvas.height / 4 + "px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("Now Decoding...", 0, 0);
    
        audio.src = window.URL.createObjectURL(DropFile);
        audioFilename = DropFile.name;
    
        if (fragmentPlayer === null)
            fragmentPlayer  = new AudioFragmentPlayer();
        fragmentPlayer.loadFile(DropFile).then(()=>{
            const n = Number(document.getElementById("SpectroSamplesN").value);
            const z = Number(document.getElementById("SpectroZoom").value);
            const h = Number(document.getElementById("SpectroHeight").value);
            const r = Number(document.getElementById("SpectroDRate").value);
            const a = Number(document.getElementById("SpectroDAdd").value);
    
            Magnification = z;
            canvas.height = h;
            spectrogramViewer = new SpectrogramViewer(canvas,fragmentPlayer.audioBuffer,
                (i,w)=>{
                    if (i < 0)
                    {
                        DrawWaveView();
                    }
                    else
                    {
                        ctx.textBaseline = "top";
                        ctx.font = canvas.height / 8 + "px sans-serif";
                        ctx.fillStyle = "white";
                    
                        ctx.clearRect(0,0,canvas.width,canvas.height * 1.5 / 8);
                        ctx.fillText("FFT:" + i + "/" + w, 0, 0);
                    }
                },
                z,h,n,r,a);
            WaveViewTime = 0;
            playbackRate.value = 1;
        });
    
        selectOverlap.style.display = "none";
        DropFile = null;
    }
    document.getElementById("SpectroCancel").onclick = (e)=>{
        selectOverlap.style.display = "none";  
        DropFile = null; 
    }
    
    


    
    function DropFiles(files)
    {
        let audioread = false;
        let textread = false;
        for (let i = 0;i < files.length;i++)
        {
            const file = files[i]
            if (file.type.indexOf("audio/") == 0)
            {
                console.log("drop audio file:" + file.name);
                if (audioread)
                    continue;
                DropFile = file;
                audioread = true;
                selectOverlap.style.display = "block";
            }
            else if (file.type.indexOf("text/") == 0 || file.name.match(/\.(lrc|kra)$/i))
            {
                console.log("drop text file:" + file.name);
                const editmode = document.getElementById( 'TabEdit' ).checked;
                if (editmode && !textread)
                {
                    file.text().then(text=>{
                        TextArea.value = text;
                    })
                    textread = true;
                }
            }
            else
            {
                console.log("ignore drop file:" + file.name);
            }
        }
    }
})();
    