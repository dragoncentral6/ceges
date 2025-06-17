import {crear, cambios, actualizar} from './firedatabase.js';

const formulario = document.getElementById("form-add");
const listdisplay = document.getElementById("list-drag");

const options = [
    {
        value: "Inactivo",
        text: "Inactivo"
    },
    {
        value: "activo",
        text: "Activo"
    },
    {
        value: "recorrido",
        text: "Recorrido"
    },
    {
        value: "operativo",
        text: "Operativo"
    }
];

const posicionEstado = [
    {
        value: "-",
        text: "-"
    },
    {
        value: "qsy",
        text: "QSY"
    },
    {
        value: "ruta",
        text: "Ruta"
    },
    {
        value: "patios",
        text: "Patios"
    },
    {
        value: "ct",
        text: "CT"
    }
];


//guardar datos
formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const alias = formulario["alias"];
    const placasM = formulario["placa"];
    const placas = placasM.toString().toUpperCase();
    const estado = "Inactivo";
    const posicion = "-"; 
    const descripcion = "";

    if(alias.value != ""){
        //crear(alias.value, placas.value, estado, posicion, descripcion);
        console.log(alias);
        console.log(placas);
        console.log("grua creada");
        //formulario.reset();
    }else{
        console.log("por favor llenar todos los campos");
    }
});

window.addEventListener('DOMContentLoaded', async() => {
        cargar("all");   

        const btnAll = document.getElementById("all");
        const btnIn = document.getElementById("Ina");
        const btnAc = document.getElementById("Act");
        const btnOp = document.getElementById("Ope");
        const btnRe = document.getElementById("Rec");


        btnAll.addEventListener("click", e =>{
            e.preventDefault();
            cargar("all");
            btnAll.classList.add("selec");
        });
        
        btnIn.addEventListener("click", e =>{
            e.preventDefault();
            cargar("Inactivo");
            btnIn.classList.add("selec");
        });
        btnAc.addEventListener("click", e =>{
            e.preventDefault();
            cargar("activo");
            btnAc.classList.add("selec");
        });
        btnOp.addEventListener("click", e =>{
            e.preventDefault();
            cargar("operativo");
            btnOp.classList.add("selec");
        });
        btnRe.addEventListener("click", e =>{
            e.preventDefault();
            cargar("recorrido");
            btnRe.classList.add("selec");
        });
        
        function cargar(params="all") {
                
            cambios((listado) =>{
                listdisplay.innerHTML = "";

                const listadoDragones = [];

                listado.forEach(doc => {
                    //aca pasamos el objeto json de firebase y lo pasamos a un array simple
                    listadoDragones.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                //ordenamos el arreglo por medio del ALias
                listadoDragones.sort((a,b) =>{
                    if(a.Alias < b.Alias){
                        return -1;
                    };
                    if(a.Alias > b.Alias){
                        return 1;
                    };
                    return 0;
                });
                
                //ordenamos el arreglo por segun el estado
                listadoDragones.sort((a,b) =>{
                    if(a.Estado < b.Estado){
                        return -1;
                    };
                    if(a.Estado > b.Estado){
                        return 1;
                    };
                    return 0;
                });


                //recorremos el array para mostrarlo
                listadoDragones.forEach(function (paramsDrag) {

                    //aqui creamos los elementos
                    const div = document.createElement("div");

                    //const labelAlias = document.createElement("label");//creando el label

                    const etiqAlias = document.createElement("abbr");// creando el abbr etiquetado
                    const selectEstado = document.createElement("select");// creando los select
                    const selectPosicion = document.createElement("select");//
                    const comentario = document.createElement("input");//creando input comentarios


                    if (params === paramsDrag.Estado) {
                        
                    //añadir clases de los estilos

                    div.classList.add("resultDrag");
                    selectEstado.classList.add("estado-grua");
                    selectPosicion.classList.add("posicion-grua");
                    comentario.classList.add("coment-grua");

                    //se asignan los datos al label y al input
                    //labelAlias.textContent =  paramsDrag.Alias;

                    etiqAlias.textContent = paramsDrag.Alias;
                    etiqAlias.setAttribute("title", paramsDrag.Placa);
                        
                    comentario.value = paramsDrag.Descripcion;
                    comentario.setAttribute("data-id", paramsDrag.id);

                    // crear los select y pasarle los datos
                    
                    // select del estado
                    const optionDefault = document.createElement("option");
                    selectEstado.appendChild(optionDefault);
                    selectEstado.setAttribute("data-id", paramsDrag.id);
                    selectEstado.classList.add(paramsDrag.Estado);
                    
                    let optionTextLS = document.createTextNode(paramsDrag.Estado);
                    optionDefault.setAttribute("value", paramsDrag.Estado);
                    optionDefault.appendChild(optionTextLS);

                    let validarEstado = paramsDrag.Estado;

                    for (let index = 0; index < options.length; index++) {
                        const datoOpt = options[index];
                        const optEstado = document.createElement("option");
                        
                        //aqui validamos que los valores del array sean iguales
                        //y creamos los demas elementos del option
                        if (validarEstado !== datoOpt.value) {
                            optEstado.setAttribute("value",datoOpt.value)
                            let optionText = document.createTextNode(datoOpt.text);
                            optEstado.appendChild(optionText);
                            selectEstado.appendChild(optEstado);
                        }
                    }

                    //select de la posicion
                    const optionDefaultPosicion = document.createElement("option");
                    selectPosicion.appendChild(optionDefaultPosicion);
                    selectPosicion.setAttribute("data-id", paramsDrag.id);
                    
                    let optionTextLSPosicion = document.createTextNode(paramsDrag.Posicion);
                    optionDefaultPosicion.setAttribute("value", paramsDrag.Posicion);
                    optionDefaultPosicion.appendChild(optionTextLSPosicion);

                    let validarPosicion = paramsDrag.Posicion;

                    for (let index = 0; index < posicionEstado.length; index++) {
                        const datoOpt = posicionEstado[index];
                        const optEstado = document.createElement("option");

                        //aqui validamos que los valores del array sean iguales
                        //y creamos los demas elementos del option
                        if (validarPosicion !== datoOpt.value) {
                            optEstado.setAttribute("value",datoOpt.value)
                            let optionText = document.createTextNode(datoOpt.text);
                            optEstado.appendChild(optionText);
                            selectPosicion.appendChild(optEstado);    
                        }
                    }

                    //Añadimos los elementos al Html
                    div.appendChild(etiqAlias);
                    div.appendChild(selectEstado);
                    div.appendChild(selectPosicion);
                    div.appendChild(comentario);

                    listdisplay.appendChild(div);

                }
                if(params === "all" ){
                    
                    //añadir clases de los estilos

                    div.classList.add("resultDrag");
                    selectEstado.classList.add("estado-grua");
                    selectPosicion.classList.add("posicion-grua");
                    comentario.classList.add("coment-grua");

                    //se asignan los datos al label y al input
                    //labelAlias.textContent =  paramsDrag.Alias;

                    //se crea etiqueta para mostrar el alias
                    etiqAlias.textContent = paramsDrag.Alias;
                    etiqAlias.setAttribute("title", paramsDrag.Placa)
                    
                    comentario.value = paramsDrag.Descripcion;
                    comentario.setAttribute("data-id", paramsDrag.id);

                    // crear los select y pasarle los datos
                    
                    // select del estado
                    const optionDefault = document.createElement("option");
                    selectEstado.appendChild(optionDefault);
                    selectEstado.setAttribute("data-id", paramsDrag.id);
                    selectEstado.classList.add(paramsDrag.Estado);
                    
                    let optionTextLS = document.createTextNode(paramsDrag.Estado);
                    optionDefault.setAttribute("value", paramsDrag.Estado);
                    optionDefault.appendChild(optionTextLS);

                    let validarEstado = paramsDrag.Estado;

                    for (let index = 0; index < options.length; index++) {
                        const datoOpt = options[index];
                        const optEstado = document.createElement("option");
                        
                        //aqui validamos que los valores del array sean iguales
                        //y creamos los demas elementos del option
                        if (validarEstado !== datoOpt.value) {
                            optEstado.setAttribute("value",datoOpt.value)
                            let optionText = document.createTextNode(datoOpt.text);
                            optEstado.appendChild(optionText);
                            selectEstado.appendChild(optEstado);
                        }
                    }

                    //select de la posicion
                    const optionDefaultPosicion = document.createElement("option");
                    selectPosicion.appendChild(optionDefaultPosicion);
                    selectPosicion.setAttribute("data-id", paramsDrag.id);
                    
                    let optionTextLSPosicion = document.createTextNode(paramsDrag.Posicion);
                    optionDefaultPosicion.setAttribute("value", paramsDrag.Posicion);
                    optionDefaultPosicion.appendChild(optionTextLSPosicion);

                    let validarPosicion = paramsDrag.Posicion;

                    for (let index = 0; index < posicionEstado.length; index++) {
                        const datoOpt = posicionEstado[index];
                        const optEstado = document.createElement("option");

                        //aqui validamos que los valores del array sean iguales
                        //y creamos los demas elementos del option
                        if (validarPosicion !== datoOpt.value) {
                            optEstado.setAttribute("value",datoOpt.value)
                            let optionText = document.createTextNode(datoOpt.text);
                            optEstado.appendChild(optionText);
                            selectPosicion.appendChild(optEstado);    
                        }
                    }

                    //Añadimos los elementos al Html
                    div.appendChild(etiqAlias);
                    div.appendChild(selectEstado);
                    div.appendChild(selectPosicion);
                    div.appendChild(comentario);

                    listdisplay.appendChild(div);
                }
   
                });

                const selctEstado = listdisplay.querySelectorAll('.estado-grua');
                const selctPosicion = listdisplay.querySelectorAll('.posicion-grua');
                const coment = listdisplay.querySelectorAll('.coment-grua');

                //console.log(selctEstado);
                
                //select del cambio de estado
                selctEstado.forEach(sel => {
                    sel.addEventListener('change', async(e) => {

                        const idEst = e.target.dataset.id;
                        if (sel.value == "Inactivo") {
                            actualizar(idEst,{
                                Estado: sel.value,
                                Posicion: "-",
                                Descripcion: ""
                            });
                        } else {
                            actualizar(idEst,{
                                Estado: sel.value,
                            });   
                        }
                        console.log("Estado actualizado correctamente");
                    });
                });


                //select del cambio de posicion
                selctPosicion.forEach(sel => {
                    sel.addEventListener('change', async(e) => {

                        let fecha = new Date();
                        let hora = fecha.getHours();
                        let minutos = fecha.getMinutes();
                        //let segundos = fecha.getSeconds();

                        let fulltime = hora+":"+minutos;

                        const idEst = e.target.dataset.id;
                        if (sel.value != "-") {
                            actualizar(idEst,{
                                Posicion: sel.value,
                                Descripcion: fulltime
                            });
                        }else{
                            actualizar(idEst,{
                                Posicion: sel.value,
                                Descripcion: ""
                            });
                        }
                        console.log("Posicion actualizada correctamente");
                    });
                });

                //comentario del cambio de descripcion
                coment.forEach(sel => {
                    sel.addEventListener('change', async(e) => {

                        const idEst = e.target.dataset.id;

                        actualizar(idEst,{
                            Descripcion: sel.value,
                        });
                        console.log("Comentario actualizado correctamente");
                    });
                });
            });

        }
});

//local Storage para los comentarios
