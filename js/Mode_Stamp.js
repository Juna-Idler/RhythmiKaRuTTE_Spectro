
(function Mode_Stamp(){

const TagStamp = document.getElementById("TagStamp");
TagStamp.innerHTML =`
<div id="TagStampListScroll">
<ol id="TagStampList">
</ol>
<div id="TagStampCursor">▲</div>
</div>
<div class="bottom_controls_area">
</div>
`;

const list = document.getElementById("TagStampList");
const cursor = document.getElementById("TagStampCursor");

var currentLine = 0;
var currentTTPos = 0;

var ruby_parent;
var ruby_begin;
var ruby_end;

function Stamp_DrawWaveView()
{
    if (!spectrogramViewer)
        return;

    const width  = canvas.width;
    const height = canvas.height;
    const nowpoint = Math.floor(width * 0.3)
    spectrogramViewer.DrawCanvas(canvas,WaveViewTime / 1000 - (nowpoint/Magnification));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(nowpoint,0,1,height);

    if (list.children.length > 0)
    {
        const view_start_ms = WaveViewTime - (nowpoint * 1000/Magnification);
        const view_end_ms = view_start_ms + (canvas.width * 1000/Magnification);

        ctx.font = Magnification / 8 + "px sans-serif";
        ctx.textBaseline = "top";


        if (currentLine >= list.children.length)
            currentLine = list.children.length - 1;
        const np = NextPoint(currentLine,-1);
        const pp = PrevPoint(currentLine,0);

        const line = list.children[currentLine];
        const sub_lines = [];
        if (np) sub_lines.push(list.children[np.line]);
        if (pp) sub_lines.push(list.children[pp.line]);


        const marks = line.querySelectorAll(".StampMarker");
        for (let i = 0;i < marks.length;i++)
        {
            const time = Number(marks[i].dataset.time);
            if (time >= 0 && time >= view_end_ms)
                break;
            if (time < 0)
                continue;
            ctx.fillStyle = i === currentTTPos ? "lime" : "red";
            const x = (time - view_start_ms) * Magnification/1000;

            ctx.fillRect(x,0,1,canvas.height);
            const next = marks[i].nextElementSibling;
            if (next && next.textContent && !marks[i].classList.contains("UpPoint") &&
                next.tagName.toLowerCase() !== "ruby")
            {
                ctx.fillStyle = "white";
                ctx.fillText(next.textContent, x + 1, 1);
            }
        }
        sub_lines.forEach(l=>{
            const marks = l.querySelectorAll(".StampMarker");
            for (let i = 0;i < marks.length;i++)
            {
                const time = Number(marks[i].dataset.time);
                if (time >= 0 && time >= view_end_ms)
                    break;
                if (time < 0)
                    continue;
                ctx.fillStyle = "blue";
                const x = (time - view_start_ms) * Magnification/1000;
    
                ctx.fillRect(x,0,1,canvas.height);
                const next = marks[i].nextElementSibling;
                if (next && next.textContent && next.tagName.toLowerCase() === "span")
                {
                    ctx.fillStyle = "white";
                    ctx.fillText(next.textContent, x + 1, 1);
                }
            }
        });

        let currentText = null;
        for (let i = 0;i < marks.length;i++)
        {
            if (i === currentTTPos)
                currentText = marks[i].classList.contains("UpPoint") ? "]" : "[]";
            const next = marks[i].nextElementSibling;
            if (next && next.textContent && next.tagName.toLowerCase() === "span")
            {
                if (i === currentTTPos)
                    currentText = "[" + next.textContent + "]";
                else if (currentText != null)
                    currentText += next.textContent;
            }
        }
        if (currentText != null) {
            ctx.font = "22px sans-serif";
            ctx.fillStyle = "white";
            ctx.textBaseline = "ideographic";
            ctx.fillText(currentText, nowpoint + 1, canvas.height);
        }
    }
}


var grap_x;
var grap_time;
var grap_mark = null;
function onDragMouseMove(e) {
    const move_x = (e.pageX - grap_x);

    let time = grap_time + (move_x * (1000 / Magnification));
    time = time < 0 ? 0 : time;
    grap_mark.dataset.time = time;
    grap_mark.title = TimeTagElement.TimeString(grap_mark.dataset.time);

    DrawWaveView();
}
function onDragMouseUp(e){
    document.removeEventListener('mousemove', onDragMouseMove, false);
    document.removeEventListener('mouseup', onDragMouseUp, false);
    canvas.style.cursor = null;

    document.addEventListener("keydown",keydown,false);
    canvas.addEventListener("mousemove",onMouseMove, false);
    audio.style.pointerEvents = null;
}
function onMouseDown(e){
    if (canvas.style.cursor == "grab")
    {
        if (grap_mark !== null)
        {
            grap_x = e.pageX;
            grap_time = Number(grap_mark.dataset.time);
            document.addEventListener("mousemove",onDragMouseMove, false);
            document.addEventListener("mouseup",onDragMouseUp, false);
            canvas.style.cursor = "grabbing";

            //都合の悪いイベントを止める
            document.removeEventListener("keydown",keydown,false);
            canvas.removeEventListener("mousemove",onMouseMove, false);
            audio.style.pointerEvents = "none";//オーディオパネルがマウスイベントを喰うのでドラッグ中は透過させる
        }
        e.stopImmediatePropagation();
    }
}
function onMouseMove(e){
    if (e.offsetY <= 16 && audio.paused)
    {
        grap_mark = GetCurrentMark();
        if (grap_mark !== null)
        {
            const nowpoint = Math.floor(canvas.width * 0.3)
            const time_x = (grap_mark.dataset.time - WaveViewTime) * Magnification/1000 + nowpoint;
            canvas.style.cursor = (time_x <= e.offsetX && e.offsetX < time_x + 16) ?  "grab" : null;
            return;
        }
    }
    canvas.style.cursor = null;
}


function GetCurrentMark()
{
    const marks = list.children[currentLine].querySelectorAll(".StampMarker");
    return  (currentTTPos < 0 || currentTTPos >= marks.length) ? null : marks[currentTTPos];
}

function MoveCursor()
{
    if (list.children.length === 0)
        return;
    if (currentLine >= list.children.length)
        currentLine = list.children.length - 1;
    const line = list.children[currentLine];

    const marks = line.querySelectorAll(".StampMarker");
    if (marks.length === 0)
    {
        cursor.style.left = "0px";
        cursor.style.top = "calc(" + (line.offsetTop + "px") + " + 1.8rem)";
        line.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"})
        return;
    }

    if (currentTTPos < 0 || currentTTPos >= marks.length)
        currentTTPos = marks.length - 1;

    const mark = marks[currentTTPos];
    cursor.style.left = mark.offsetLeft + "px";
    cursor.style.top = "calc(" + (mark.offsetTop + "px") + " + 1.8rem)";
    line.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"})
}

function NextPoint(line,ttpos)
{
    const current_marks = list.children[line].querySelectorAll(".StampMarker");
    if (ttpos < 0)
        ttpos = current_marks.length - 1;
    if (ttpos + 1 >= current_marks.length)
    {
        for (let i = line + 1;i < list.children.length;i++)
        {
            const marks = list.children[i].querySelectorAll(".StampMarker");
            if (marks.length > 0)
            {
                return {line:i,ttpos:0};
            }
        }
        return null;
    }
    return {line:line,ttpos:ttpos + 1};
}
function PrevPoint(line,ttpos)
{
    if (ttpos - 1 < 0)
    {
        for (let i = line - 1;i >= 0;i--)
        {
            const marks = list.children[i].querySelectorAll(".StampMarker");
            if (marks.length > 0)
            {
                return {line:i,ttpos:marks.length - 1};
            }
        }
        return null;
    }
    return {line:line,ttpos:ttpos - 1};
}

function StepNext()
{
    const np = NextPoint(currentLine,currentTTPos);
    if (np !== null)
    {
        currentLine = np.line;
        currentTTPos = np.ttpos;
        return true;
    }
    return false;
}
function StepPrev()
{
    const pp = PrevPoint(currentLine,currentTTPos);
    if (pp !== null)
    {
        currentLine = pp.line;
        currentTTPos = pp.ttpos;
        return true;
    }
    return false;
}

function GetCurrentTime()
{
    const mark = GetCurrentMark();
    return (mark === null) ? -1 : mark.dataset.time;
}

function keydown(e)
{
    e.preventDefault();

    switch (e.code)
    {
        case "KeyA":case "ArrowLeft":
            StepPrev();
            MoveCursor();
        break;
        case "KeyD":case "ArrowRight":
            StepNext();
            MoveCursor();
        break;
        case "KeyW":case "ArrowUp":
            if (--currentLine < 0)
                currentLine = 0;
            currentTTPos = 0;
            MoveCursor();
            {
            const time = GetCurrentTime();
            if (time >= 0) audio.currentTime = time /1000;
            }
        break;
        case "KeyS":case "ArrowDown":
            if (currentLine + 1 < list.children.length)
                currentLine++;
            currentTTPos = 0;
            MoveCursor();
            {
                const time = GetCurrentTime();
                if (time >= 0) audio.currentTime = time /1000;
            }
        break;
        case "Space":
        case "Enter":
            if (!e.repeat)
            {
                const mark = GetCurrentMark();
                if (mark === null || mark.classList.contains("UpPoint"))
                    break;

                mark.dataset.time = audio.currentTime * 1000;
                mark.title = TimeTagElement.TimeString(mark.dataset.time);
                StepNext();
                MoveCursor();
            }
        break;
        case "Delete":
        break;
        case "KeyZ":
            audio.currentTime = (audio.currentTime - 1 < 0) ? 0 : audio.currentTime - 1;
        break;
        case "KeyX":
            if (audio.paused)
                audio.play();
            else
                audio.pause();
        break;
        case "KeyC":
            audio.currentTime = audio.currentTime + 1;
        break;
    }
    DrawWaveView();
}
function keyup(e)
{
    e.preventDefault();

    switch (e.code)
    {
        case "Space":
        case "Enter":
            {
                const mark = GetCurrentMark();
                if (mark === null || !mark.classList.contains("UpPoint"))
                    break;
                mark.dataset.time = audio.currentTime * 1000;
                mark.title = TimeTagElement.TimeString(mark.dataset.time);
                StepNext();
                MoveCursor();
                DrawWaveView();
            }
        break;
    }
}

function append_marker(parent,ref_node,time,option)
{
    if (time >= 0)
    {
        const marker = document.createElement("span");
        marker.classList.add("StampMarker");
        if (option.includes("n"))
            marker.dataset.time = -1;
        else
            marker.dataset.time = time;
        marker.title = (marker.dataset.time < 0) ? "null" : TimeTagElement.TimeString(marker.dataset.time);
        if (option.includes("u"))
        {
            marker.classList.add("UpPoint");
            marker.textContent = "]";
        }
        else
            marker.textContent = "[";
        parent.insertBefore(marker,ref_node);
    }
}

function Initialize(serialize,line)
{
    const lyrics = CreateLyricsContainer(serialize);
    ruby_parent = lyrics.atTag.ruby_parent;
    ruby_begin = lyrics.atTag.ruby_begin;
    ruby_end = lyrics.atTag.ruby_end;

    lyrics.lines.forEach(line=>{
        const li = document.createElement("li");
        li.classList.add("StampLine");
        li.onclick = (e)=>{
            const li = e.currentTarget;
            let i;
            for (i = 0;i < list.children.length;i++)
                if (list.children[i] === li)
                    break;
            currentLine = i;
            currentTTPos = 0;
            MoveCursor();
            DrawWaveView();
        };

        append_marker(li,null,line.start_time,line.start_option);
        line.units.forEach(rkunit=>{
            let parent_element = li;
            let ref_node = null;

            if (rkunit.hasRuby)
            {
                const ruby = document.createElement("ruby");
                const rt = document.createElement("rt");
                rt.textContent = rkunit.base_text;
                ruby.appendChild(rt);
                li.appendChild(ruby);
                parent_element = ruby;
                ref_node = rt;
            }

            const kunit = rkunit.phonetic;
            let span = null;
            for (let i = 0;i < kunit.text_array.length;i++)
            {
                if (kunit.start_times[i] >= 0)
                {
                    if (span !== null)
                    {
                        parent_element.insertBefore(span,ref_node);
                    }
                    span = document.createElement("span");
                    span.classList.add("StampChar")
                    append_marker(parent_element,ref_node,kunit.start_times[i],kunit.start_options[i]);
                }
                else if (span === null)
                {
                    span = document.createElement("span");
                    span.classList.add("StampChar")
                }
                span.textContent += kunit.text_array[i];
                if (kunit.end_times[i] >= 0)
                {
                    parent_element.insertBefore(span,ref_node);
                    append_marker(parent_element,ref_node,kunit.end_times[i],kunit.end_options[i]);
                    span = null;
                }
            }
            if (span !== null)
            {
                parent_element.insertBefore(span,ref_node);
            }

        });
        append_marker(li,null,line.end_time,line.end_option);
        list.appendChild(li);
    });

    if (line >= 0)
    {
        currentLine = line;
        currentTTPos = 0;
    }
    if (currentLine >= list.children.length)
        currentLine = list.children.length;
    document.addEventListener("keydown",keydown,false);
    document.addEventListener("keyup",keyup,false);
    MoveCursor();

    //"mousedown"のstopImmediatePropagationの為に登録順番を変える
    SetDefaultCanvasMouseEvent(false);
    canvas.addEventListener("mousedown",onMouseDown, false);
    canvas.addEventListener("mousemove",onMouseMove, false);
    SetDefaultCanvasMouseEvent(true);

    DrawWaveView = Stamp_DrawWaveView;
}

function Serialize(e)
{
    if (e.classList.contains("StampMarker"))
    {
        const option = (e.classList.contains("UpPoint")) ? "up" : "p";
        if (e.dataset.time < 0)
            return TimeTagElement.TimeString_option(0,option + "n");
        return TimeTagElement.TimeString_option(e.dataset.time,option);
    }
    else if (e.classList.contains("StampChar"))
    {
        return e.textContent;
    }
    return "";
}

function Terminalize()
{
    let text = "";
    for (let i = 0; i < list.children.length;i++)
    {
        const li = list.children[i];
        for (let j = 0;j < li.children.length;j++)
        {
            if (li.children[j].tagName.toLowerCase() === "ruby")
            {
                const ruby = li.children[j];
                let parent_text = "";
                let ruby_text = "";
                for (let k = 0;k < ruby.children.length;k++)
                {
                    const e = ruby.children[k];
                    if (e.tagName.toLowerCase() === "rt")
                        parent_text = e.textContent;
                    else
                        ruby_text += Serialize(e);
                }
                text += ruby_parent + parent_text + ruby_begin + ruby_text + ruby_end;
            }
            else
            {
                text += Serialize(li.children[j]);
            }
        }
        text += "\n";
    }

    while (list.firstChild)
        list.firstChild.remove();
    document.removeEventListener("keyup",keyup,false);
    document.removeEventListener("keydown",keydown,false);
    canvas.removeEventListener("mousemove",onMouseMove, false);
    canvas.removeEventListener("mousedown",onMouseDown, false);
    DrawWaveView = DefaultDrawWaveView;

    return [text.slice(0,-1),currentLine];
}

StampModeInitializer = {Initialize:Initialize,Terminalize:Terminalize};

}());

