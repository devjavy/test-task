// Я бы мог оставить комментарии и на английском, но т.к. данный код не будет (?) использоваться в продакшене, то решил оставить комментарии на русском
// Я использовал предложенный вами шаблон
// В примере не было указано что полигон не может быть complex polygon поэтому нету обработки чтобы линии не пересекались.
// Добавил от себя: ПКМ в режиме добавления точек - удалить последнюю точку; более четкие сообщения почему кнопка не доступна; мелкие анимации на кнопки
// Я решил не вырезать то что использовал для дебага, последний раз тестовое выполнял более 2 лет назад, не знаю стоит ли оставлять :). Простите если лишний мусор в коде, мне не проблема была его убрать
// Комменты /*html*/ оставил для того, чтобы работала подсветка.  
class PolygonEditor extends HTMLElement {
    constructor() {
        super();
        this.pointSize = 5; // просто для конфигурации, размер точки
        this.lineSize = 2; // так же для конфигурации, размер линии. Если по ней проходит путь то 2x размер для четкости
        this.points = []; // храним оставленные пользователем точки
        this.connections = []; // и соединения между ними
        
        this.polygonDrawn = false; // отрисован ли полигон
        this.creationMode = false; // находимся ли мы в режиме создания полигона
        this.validPolygon = false; // условия - не меньше 3 и не больше 15
        
        this.drawPathInfo = {
            direction: "clockwise", //clockwise и counterClockwise
            // В тз не было сказано использовать TypeScript, поэтому вместо enum будет просто два режима работы с соответствующими строками
            pickedPoint: "", // текущая выбираемая точка: start / end
            pathPoints: [], // массив точек на пути, нам нужны будут их имена
            start: null, // начальная точка
            end: null // конечная точка
        }


        this.shadow = this.attachShadow(
            {mode: "open"}
        );
        this.loadSaved();
    }

    // Отрисовать когда в DOM полностью
    connectedCallback() {
        this.render();
    }

    indexToName(index){
        return "p"+String(index+1)
    }

    loadSaved(){
        let saved = localStorage.getItem("polygonEditorData")
        if (saved){
            saved = JSON.parse(saved)
            this.points = saved;
            this.validPolygon = true;
            this.polygonDrawn;
            this.drawPolygon();
        }
    }

    clearSaved(){
        localStorage.removeItem("polygonEditorData")
    }

    clearPath(){
        this.drawPathInfo.pathPoints = [];
        this.connections = this.connections.map((el)=>{
                    el.partOfPath = false;
                    return el
        })
        this.render()
    }

    attachEventListeners(){ // прикрепляем обработчики (при рендере)
        this.shadow.querySelector("#createPoints").addEventListener("click", this.switchCreateMode.bind(this))
        this.shadow.querySelector("#drawPolygon").addEventListener("click", this.drawPolygon.bind(this))
        if (this.creationMode){
            try{
                this.shadow.querySelector(`#polygonEditorPreview`).removeEventListener("click", this.pickCurrentPoint.bind(this))
            }
            catch(e){}
            this.shadow.querySelector(`#polygonEditorPreview`).addEventListener("click", this.placePoint.bind(this))
            this.shadow.querySelector(`#polygonEditorPreview`).addEventListener("contextmenu", (e)=>{
                e.preventDefault() // добавил от себя удаление последней точки на ПКМ т.к. нужно было для удобства тестов. Если мешает - можете закомментировать
                this.points.pop()
                this.render()
            })
        }
        else{
            try{
                this.shadow.querySelector(`#polygonEditorPreview`).removeEventListener("click", this.placePoint.bind(this))
            }
            catch(e){}
        }
        this.shadow.querySelectorAll("[data-pick-point]").forEach((el)=>{
            el.addEventListener("click", (event)=>{
                this.drawPathInfo.pickedPoint = event.target.dataset.pickPoint; // сохраняем то, какую мы точку выбираем
                this.render()
            });
        })
        if (this.drawPathInfo.pickedPoint){
            
            this.shadow.querySelectorAll("[data-point-key]").forEach((el)=>{
                el.addEventListener("click", this.pickCurrentPoint.bind(this)); // выбираем точку и записываем в ранее указаннную ячейку - start или end
            });
        }
        this.shadow.querySelector(`#pathClear`).addEventListener("click", ()=>{
            // просто очистка состояния и localStorage
            this.points = [];
            this.connections = [];
            this.polygonDrawn = false;
            this.drawPathInfo = {
                direction: "clockwise",
                pickedPoint: "",
                pathPoints: [],
                start: null,
                end: null
            };
            this.clearSaved()
            this.render()
        })
        if (this.drawPathInfo.pathPoints.length) {
            this.shadow.querySelector(`#changeDirection`).addEventListener("click", (e)=>{
                
                this.drawPathInfo.direction = this.drawPathInfo.direction=="clockwise" ? "counterClockwise" : "clockwise";
                this.clearPath()
                this.drawPath()
                this.render()
            })
        }
    }
    // detachEventListeners(){ // открепляем при ре-рендере
    //     try{
    //         this.shadow.querySelector(`#polygonEditorPreview`).removeEventListener("click", this.placePoint.bind(this))
    //     }
    //     catch(e){}
    // }

    switchCreateMode(){
        
        this.creationMode = !this.creationMode && !this.polygonDrawn; // проверка на то, чтобы не давать добавлять новые точки при нарисованном полигоне
        console.log("new mode: ", this.creationMode);
        this.render();
    }
    
    placePoint(e){
        console.log(e.target);
        console.log(this);
        
        
        // Код ниже нужен  для трансформации клика мыши  в относительные для SVG координаты
        let newPoint = e.target.createSVGPoint() 
        newPoint.x = e.clientX;
        newPoint.y = e.clientY;
        let {x,y} = newPoint.matrixTransform(
            e.target.getScreenCTM() // Преобразуем из SVG в документную систему координат
            .inverse() // и преобразуем обратно чтобы получить где мы кликнули
        );
        // сохраняем точки и сразу прописываем имя (оно понадобится для отображения в строке Path: p1-p2-p3 ...)
        this.points.push({
            x,
            y,
            name: "p"+(this.points.length+1
            )
        })
        console.log(this.points);
        this.render()
    }
    pickCurrentPoint(e){
        if (this.drawPathInfo.pickedPoint){ // если мы выбрали одну из точек то проверяем, на какую точку мы нажали
            if (e.target.dataset.pointKey){
                console.log(e.target);
                this.drawPathInfo[this.drawPathInfo.pickedPoint] = Number(e.target.dataset.pointKey); // после чего сохраняем её как индекс в соответсвующее значение this.drawPathInfo
                this.drawPathInfo.pickedPoint = "";
                if (this.drawPathInfo.start!==null && this.drawPathInfo.end!==null){ // Если выбраны ОБЕ точки, то немедленно запускаем генерацию пути, предварительно очистив предыдущий
                    // Ещё стоило бы как то обрабатывать клик на уже выбранную в другой слот точку, но в задании не указано как поступать в этом случае, поэтому я просто добавлю перевыбор и удаление из старого места
                    if (this.drawPathInfo.start===this.drawPathInfo.end){
                        let removedValue = this.drawPathInfo.pickedPoint=="start" ? "end" : "start";
                        this.drawPathInfo[removedValue] = null;
                    }
                    else {
                        this.clearPath();
                        this.drawPath();
                    }
                }
                this.render()
            }
        }
    }

    drawPath(){
        console.log(this.drawPathInfo.start, this.drawPathInfo.end);
        let currentPathIndex;
        let lastPathIndex;
        if (this.drawPathInfo.direction=="clockwise"){ // устанвавливаем в каком порядке пройтись по элементам
            currentPathIndex = this.drawPathInfo.start;
            lastPathIndex = this.drawPathInfo.end;
        }
        else if (this.drawPathInfo.direction=="counterClockwise"){ // Меняем местами начало и конец для корректности
            currentPathIndex = this.drawPathInfo.end;
            lastPathIndex = this.drawPathInfo.start;
        }
        while (currentPathIndex!==lastPathIndex){ // проходимся, ставим соединениям соответствующие стили
            this.connections[currentPathIndex].partOfPath = true;
            this.drawPathInfo.pathPoints.push(this.points[currentPathIndex]);
            currentPathIndex++;
            if (currentPathIndex==this.connections.length){ 
                // а в случае если дошли до конца возвращаемся к началу. Я знаю что можно было бы и в однострочник запаковать (currentPathIndex=currentPathIndex%this.connections.length), но так читаемее, как мне кажется
                currentPathIndex=0;
            }
        }
        this.drawPathInfo.pathPoints.push(this.points[lastPathIndex]); // добавляем вторую точку чтобы путь был завершенным, просто для отображения в строке path
        if (this.drawPathInfo.direction=="counterClockwise"){ // Если против часовой то мы должны сделать reverse, ведь конечная и начальная точка не менялись местами
            this.drawPathInfo.pathPoints.reverse()
        }
        this.render();
    }

    drawPolygon(e){
        this.points.forEach((el, key)=>{ // для каждой точки создаем соединение со следующей, а для последней - с первой
            this.connections.push({
                partOfPath: false,
                x1: el.x,
                y1: el.y,
                ...(key==this.points.length-1 ? {
                    x2: this.points[0].x,
                    y2: this.points[0].y
                } : {
                    x2: this.points[key+1].x,
                    y2: this.points[key+1].y
                })
            })
        })
        this.polygonDrawn = true; // меняем внутреннее состояние
        this.switchCreateMode(); // отключаем режим добавления точек, проверка на то чтобы случайно не включился во время рисования пути в него встроена 
        localStorage.setItem("polygonEditorData", JSON.stringify(this.points)); // сохраняем точки для нашего полигона т.к. мы его отрисовали. Можно ещё добавить атрибут для кастомного ключа в localStorage чтобы избегать пересечений
        this.render()
    }

    render() {
        let validPolygon = this.points.length >= 3 && this.points.length <= 15; // проверяем соответствует ли полигон условиям на момент рендера
        const statusColor = validPolygon ? "#34eb61" : "#eb4034"; // валиден - зеленый, иначе - красный
        const pointsButton = (
            /*html*/`<button id="createPoints" ${this.polygonDrawn ? "disabled" : ""}>${this.polygonDrawn ? "You can't add points" : this.creationMode ? "Stop creating points" : "Create points"}</button>`
        );
        const pointsStatus = (
            /*html*/`<span style="color: ${statusColor};" class="pointsStatus">Created ${this.points.length} points</span>`
        );
        const drawButton = (
            /*html*/`<button id="drawPolygon" ${this.polygonDrawn || !validPolygon ? "disabled" : ""}>${this.polygonDrawn ? "✅ Drawn" : validPolygon ? "Draw Polygon" :  "❌ Your polygon should have 3-15 points"}</button>`
        );
        
        const svgConnections = this.connections.map((item,key)=>( // рисуем сначала соединения, чтобы они не перекрывали точки и текст
            `<line x1="${item.x1}" y1="${item.y1}" x2="${item.x2}" y2="${item.y2}" stroke="${item.partOfPath ? "blue" : "black"}" stroke-width="${item.partOfPath ? (this.lineSize*2) : this.lineSize}px"/>`
        )).join("\n");
        const svgPoints = this.points.map((item,key)=>(`
            <circle data-point-key="${key}" fill="#f9efd1" stroke="black" cx="${item.x}" cy="${item.y}" r="${this.pointSize}"/>
            <text fill="#d8d8d8" x="${item.x}" y="${Math.max(0, item.y - this.pointSize*2.5)}">${item.name}</text>
            `)).join("\n");

        const pointPicker = ((title, pointStorage)=>{ // своеобразный шаблон для одинакового компонента чтобы не писать дважды одно и тоже
            return /*html*/`<div class="pointPickWrap">
                            <button ${(this.drawPathInfo.pickedPoint==pointStorage || !this.polygonDrawn) && "disabled"} data-pick-point="${pointStorage}">${this.drawPathInfo.pickedPoint==pointStorage ? "Choose "+title+" point" : title+" point"}</button>
                            <p>${this.drawPathInfo[pointStorage]===null ? "N/A" : this.points[this.drawPathInfo[pointStorage]].name}</p>
            </div>`
        })
        

        this.shadow.innerHTML = /*html*/`
            <style>
                /*Стили брались на глаз из примера, могут незначительно отличаться от того что было в скриншоте*/
                .polygonEditorWrap {/*Я не знаком с тем как у вас принято именовать классы, сам обычно именую camelCase т.к. часто загружаю их как модули в React-приложениях*/
                    min-height: 300px;
                    background-color: #4c4c4c; 
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    gap: 20px;
                    padding: 10px 20px;
                    color: #fff;
                }
                #polygonEditorPreview{
                    flex-basis: 60%;
                    
                    background-color: #989898;
                    border: 1px solid #000;
                }
                .polygonEditorOptions{ 
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 20px;
                    flex-basis: 30%;

                }
                .polygonEditorOptionsGroup{
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }
                .polygonEditorOptionsGroup button{
                    background-color: #8f8f8f;
                    color: #FFF;
                    border: 1px solid #000;
                    border-radius: 3px;
                    padding: 3px 0;
                    width: 100%;
                    transition: 0.3s all ease;
                    /*Посчитал что можно использовать nesting, ориентировался на https://caniuse.com/css-nesting */
                    &:hover{
                        filter: brightness(110%);
                    }
                    &:active{
                        transform: scale(0.95); /*я вкурсе про отдельное свойство scale, только не помню, вызывает ли оно GPU, поэтому выбрал традиционный метод*/
                        filter: brightness(95%);
                    }
                    &:disabled{
                        filter: brightness(50%);
                    }
                }
                .polygonEditorOptionsGroup>h3{
                    color: #FFF;
                }
                .pointsStatus{
                    text-align: right;
                    align-self: end;
                    font-size: 0.5em;
                }
                .pointPickWrap{
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    width: 100%;
                }
                .pointPickWrap>button{
                    width: 60%;
                    text-transform: capitalize;
                }
                .polygonEditorOptionsGroup{
                    font-weight: bold;
                    font-size: 12px;
                }
            </style>
            <div class="polygonEditorWrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" id="polygonEditorPreview">
                    ${svgConnections}
                    ${svgPoints}
                </svg>
                <div class="polygonEditorOptions">
                    <div class="polygonEditorOptionsGroup">
                        <h3>Create Polygons</h3>
                        ${pointsButton}
                        ${pointsStatus}
                        ${drawButton}
                    </div>
                    <div class="polygonEditorOptionsGroup">
                        <h3>Create Path</h3>
                        ${pointPicker("first", "start")}
                        ${pointPicker("second", "end")}
                        <button ${!this.polygonDrawn && "disabled"} id="changeDirection">${this.drawPathInfo.direction=="clockwise"  ? "Clockwise" : "Counterclockwise"} order</button>
                        <button id="pathClear">Clear</button>
                        <div id="pathInfo">${this.drawPathInfo.pathPoints.length ? "Path: "+this.drawPathInfo.pathPoints.map(el=>(el.name)).join(" - ") : "Select First and second point to draw a path"}</div>
                    </div>
                </div>
            </div>
        `;
        this.attachEventListeners() // добавляем обработчики т.к. они слетают вместе с обновлением DOM
    }
}

// Регистрируем компонент
customElements.define('polygon-editor', PolygonEditor);
