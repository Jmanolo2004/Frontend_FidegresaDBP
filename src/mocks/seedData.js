// Datos de demostración del servidor simulado (mismos datos del prototipo original).
export function createSeedData() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dateDaysAgo = days => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };
  const locations = [
    {id:1,nombre:"Café de la Plaza",categoria:"Cafetería",direccion:"Av. José Larco 812",distrito:"Miraflores",latitud:-12.1225,longitud:-77.0298,mapX:410,mapY:325,horario:"Lun a dom · 7:00 a 20:00",activa:true},
    {id:2,nombre:"Dulce Encuentro",categoria:"Repostería",direccion:"Av. Primavera 1245",distrito:"Santiago de Surco",latitud:-12.1096,longitud:-76.9922,mapX:735,mapY:535,horario:"Mar a dom · 9:00 a 19:00",activa:true},
    {id:3,nombre:"Barbería Norte",categoria:"Barbería",direccion:"Av. Conquistadores 428",distrito:"San Isidro",latitud:-12.0975,longitud:-77.0365,mapX:625,mapY:245,horario:"Lun a sáb · 10:00 a 21:00",activa:true},
    {id:4,nombre:"La Mesa Alegre",categoria:"Restaurante",direccion:"Jr. Domeyer 245",distrito:"Barranco",latitud:-12.1451,longitud:-77.0218,mapX:300,mapY:555,horario:"Lun a dom · 13:00 a 23:00",activa:false},
    {id:5,nombre:"Confitería Nube",categoria:"Confitería",direccion:"Av. Aviación 2730",distrito:"San Borja",latitud:-12.1014,longitud:-76.9993,mapX:585,mapY:455,horario:"Lun a sáb · 8:30 a 18:30",activa:true}
  ];
  const names = [
    "Lucía Martínez","Mateo Fernández","Valentina Rojas","Santiago Pérez","Camila Torres","Daniela Castillo",
    "Andrés Vega","Isabella Cruz","Gabriela Flores","Diego Salazar","Mariana López","Joaquín Herrera",
    "Paola Mendoza","Sebastián Castro","Alessia Romero","Nicolás Silva","Renata Vargas","Thiago Paredes",
    "Mía Gutiérrez","Adrián Navarro","Fernanda León","Bruno Cabrera","Antonella Reyes","Gabriel Chávez",
    "Daniela Ponce","Emilio Rivas","Ximena Acosta","Rodrigo Campos","Carolina Medina","Álvaro Fuentes"
  ];
  const visitCounts = [18,14,12,7,16,11,8,20,13,9,15,12,10,17,8,14,11,19,9,13,16,10,12,18,7,15,11,14,9,17];
  const lastVisitDays = [2,4,9,76,1,12,95,3,22,6,81,18,45,5,105,8,31,14,121,7,62,19,10,48,88,11,28,3,140,17];
  const comments = [
    "El café estuvo buenísimo y sumaron mi visita al instante.",
    "Me encanta que el beneficio sea claro y fácil de usar.",
    "La atención fue amable; volveré por mi recompensa.",
    "Todo rico, aunque hoy tuve que esperar un poco.",
    "La tarjeta me anima a regresar más seguido.",
    "El equipo explicó muy bien cómo funciona el programa.",
    "Buena experiencia y un premio que sí provoca.",
    "Me gustaría ver el saldo de mis beneficios con más detalle.",
    "Atención rápida y productos frescos, lo recomiendo.",
    "Una forma sencilla de agradecer a quienes volvemos."
  ];
  const visitsByCustomer=[];
  const customers = names.map((name,index) => {
    const location = locations[Math.floor(index / 6)];
    const count = visitCounts[index];
    const lastDays = lastVisitDays[index];
    const registrationDays = Math.min(364,lastDays + 45 + (index % 8) * 35);
    const weightedDays = [];
    for(let daysAgo=lastDays+1;daysAgo<=registrationDays;daysAgo++){
      const date=new Date(today);
      date.setDate(date.getDate()-daysAgo);
      const weight=1+(date.getDay()===0||date.getDay()===6?2:0)+(date.getMonth()===6||date.getMonth()===11?3:0);
      for(let repeat=0;repeat<weight;repeat++) weightedDays.push(daysAgo);
    }
    const selectedDays=new Set();
    const visitDays=Array.from({length:count-1},(_,visitIndex)=>{
      let poolIndex=(visitIndex*97+index*13)%weightedDays.length;
      while(selectedDays.has(weightedDays[poolIndex])) poolIndex=(poolIndex+1)%weightedDays.length;
      const candidate=weightedDays[poolIndex];
      selectedDays.add(candidate);
      return candidate;
    }).concat(lastDays).sort((first,second)=>second-first);
    const visits = visitDays.map((daysAgo,visitIndex) => {
      return {
        id:`${index+1}-${visitIndex+1}`,
        clienteId:index+1,
        ubicacionId:location.id,
        fecha:dateDaysAgo(daysAgo),
        monto:Number((18 + ((index*13 + visitIndex*11) % 73) + (location.id*2.5)).toFixed(2)),
        premioCanjeado:location.id%2===1&&visitIndex>0&&visitIndex%10===0
      };
    });
    visitsByCustomer.push(visits);
    const lastVisit = visits.at(-1);
    return {
      id:index+1,
      nombre:name,
      correo:`${name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,".")}@correo.pe`,
      telefono:(()=>{
        const digits=`9${String(10000000 + index*31711).slice(0,8)}`;
        return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
      })(),
      tarjeta:location.nombre,
      localId:location.id,
      distrito:location.distrito,
      latitud:Number((location.latitud + Math.cos(((index*47)%360)*Math.PI/180)*(180+index*14)/111320).toFixed(6)),
      longitud:Number((location.longitud + Math.sin(((index*47)%360)*Math.PI/180)*(180+index*14)/(111320*Math.cos(location.latitud*Math.PI/180))).toFixed(6)),
      mapX:Math.max(45,Math.min(955,location.mapX + Math.round(Math.cos(index*1.7)*(70+(index%5)*34)))),
      mapY:Math.max(45,Math.min(655,location.mapY + Math.round(Math.sin(index*1.3)*(55+(index%4)*31)))),
      fechaRegistro:dateDaysAgo(registrationDays),
      ultimaVisita:lastVisit.fecha,
      visitas:visits.length,
      estampillas:location.id % 2 ? visits.length % 10 : 0,
      saldoCashback:location.id % 2 === 0 ? Number((visits.reduce((sum,visit)=>sum+visit.monto,0)*0.05).toFixed(2)) : 0,
      cumpleanos:index % 3 === 0 ? `${String((index%27)+1).padStart(2,"0")}/${String((index%12)+1).padStart(2,"0")}` : null,
      lastKnownZone:location.distrito,
      consentimientoUbicacion:index % 5 !== 0,
      notificacionesActivas:index % 6 !== 0,
      tipoTarjeta:["Estampillas","Cashback","Niveles","Giftcard"][index % 4],
      iniciales:name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase(),
      foto:null,
      estado:lastDays <= 60 ? "Activa" : "Inactiva"
    };
  });
  const visits = visitsByCustomer.flat();
  const cards = [
    { id:1, nombre:"Un café con cariño", tipo:"Estampillas", negocio:locations[0].nombre, descripcion:"Cada visita te acerca a una recompensa.", colores:{primario:"#603f2a",acento:"#c8894f"}, estilo:"elegante", imagen:null, estado:"Activa", vigenciaMeses:12, terminos:"Una estampilla por visita. No acumulable con otras promociones.", reglas:{sellosMeta:10,premio:"Un café gratis",iconoSello:"star",selloPor:"visita",montoMinimo:15,limitePorDia:1} },
    { id:2, nombre:"Dulce encuentro", tipo:"Estampillas", negocio:locations[1].nombre, descripcion:"Premiamos cada momento dulce.", colores:{primario:"#79523b",acento:"#e6b983"}, estilo:"vibrante", imagen:null, estado:"Activa", vigenciaMeses:6, terminos:"Válido para compras en Dulce Encuentro.", reglas:{sellosMeta:8,premio:"Una porción de torta",iconoSello:"reward",selloPor:"compra mínima",montoMinimo:20,limitePorDia:2} },
    { id:3, nombre:"Cashback de la Plaza", tipo:"Cashback", negocio:locations[0].nombre, descripcion:"Recibe saldo con cada compra.", colores:{primario:"#4e6651",acento:"#b8c99a"}, estilo:"minimal", imagen:null, estado:"Activa", vigenciaMeses:12, terminos:"El saldo se acumula en la cuenta del cliente.", reglas:{porcentaje:5,topeMensual:100,saldoMinimoCanje:10,expiraDias:180} },
    { id:4, nombre:"Cashback Barbería Norte", tipo:"Cashback", negocio:locations[2].nombre, descripcion:"Un beneficio para volver a tu barbería.", colores:{primario:"#4a2f20",acento:"#c8894f"}, estilo:"elegante", imagen:null, estado:"En pausa", vigenciaMeses:3, terminos:"Saldo válido solo en Barbería Norte.", reglas:{porcentaje:8,topeMensual:150,saldoMinimoCanje:15,expiraDias:90} },
    { id:5, nombre:"Círculo de la Plaza", tipo:"Niveles", negocio:locations[0].nombre, descripcion:"Más visitas, más beneficios.", colores:{primario:"#53616b",acento:"#d9b28c"}, estilo:"minimal", imagen:null, estado:"Activa", vigenciaMeses:12, terminos:"Los puntos no son transferibles.", reglas:{niveles:[{nombre:"Bronce",desdePuntos:0,beneficio:"Acceso al programa",color:"#b8794f"},{nombre:"Plata",desdePuntos:100,beneficio:"5% de descuento",color:"#9da5ad"},{nombre:"Oro",desdePuntos:300,beneficio:"Bebida de cortesía",color:"#d4a84e"}],puntosPorSol:1} },
    { id:6, nombre:"Nube de beneficios", tipo:"Niveles", negocio:locations[4].nombre, descripcion:"Un detalle especial en cada nivel.", colores:{primario:"#8a563e",acento:"#e5bd93"}, estilo:"vibrante", imagen:null, estado:"Borrador", vigenciaMeses:12, terminos:"Beneficios sujetos a disponibilidad.", reglas:{niveles:[{nombre:"Amigo",desdePuntos:0,beneficio:"Bienvenida especial",color:"#bf8a65"},{nombre:"Frecuente",desdePuntos:150,beneficio:"10% de descuento",color:"#c8894f"},{nombre:"Preferente",desdePuntos:400,beneficio:"Producto de regalo",color:"#603f2a"}],puntosPorSol:2} },
    { id:7, nombre:"Un regalo de la Plaza", tipo:"Giftcard", negocio:locations[0].nombre, descripcion:"Regala una pausa para disfrutar.", colores:{primario:"#79523b",acento:"#e3bc8a"}, estilo:"elegante", imagen:null, estado:"Activa", vigenciaMeses:12, terminos:"La gift card no es canjeable por efectivo.", reglas:{montos:[50,100,200],permiteMontoLibre:true,montoMin:30,montoMax:500,vigenciaMeses:12,mensajeRegalo:"Un momento rico para ti"} },
    { id:8, nombre:"Dulce regalo", tipo:"Giftcard", negocio:locations[1].nombre, descripcion:"Comparte algo dulce con quien quieres.", colores:{primario:"#603f2a",acento:"#dca66f"}, estilo:"vibrante", imagen:null, estado:"Activa", vigenciaMeses:6, terminos:"Válida por una sola compra hasta agotar saldo.", reglas:{montos:[50,100,200],permiteMontoLibre:false,montoMin:50,montoMax:200,vigenciaMeses:6,mensajeRegalo:"Para endulzar tu día"} }
  ].map(card => {
    const now = dateDaysAgo(45);
    return { ...card, creadaEn:now, actualizadaEn:now };
  });
  const reviews = Array.from({length:36},(_,index) => {
    const customer = customers[(index*7+2)%customers.length];
    const location = locations.find(place=>place.id===customer.localId);
    const rating = [5,5,4,5,3,4,5,2,4,5,3,5,4,1,5][index%15];
    return {
      id:index+1,
      clienteId:customer.id,
      nombre:customer.nombre,
      iniciales:customer.iniciales,
      negocio:location.nombre,
      ubicacionId:location.id,
      fecha:dateDaysAgo(index*4+1),
      calificacion:rating,
      comentario:comments[index%comments.length],
      sentimiento:rating>=4?"Positiva":rating===3?"Neutral":"Por mejorar",
      respuesta:index%3===0?"¡Gracias por volver! Nos alegra que hayas disfrutado tu visita.":null
    };
  });
  const monthStart = (date,monthOffset=0) => new Date(date.getFullYear(),date.getMonth()+monthOffset,1);
  const monthlyVisits = Array.from({length:12},(_,index)=>{
    const start=monthStart(today,index-11);
    const end=monthStart(today,index-10);
    const records=visits.filter(visit=>new Date(visit.fecha)>=start&&new Date(visit.fecha)<end);
    return {
      fecha:start.toISOString(),
      visitas:records.length,
      ventas:Number(records.reduce((sum,visit)=>sum+visit.monto,0).toFixed(2))
    };
  });
  const activeCustomers=customers.filter(customer=>today-new Date(customer.ultimaVisita)<=60*86400000).length;
  const categoryCounts=locations.reduce((counts,location)=>{
    counts[location.categoria]=(counts[location.categoria]||0)+customers.filter(customer=>customer.localId===location.id).length;
    return counts;
  },{});
  locations.forEach(location=>{
    location.clientes=customers.filter(customer=>customer.localId===location.id).length;
    location.latitud=Number(location.latitud.toFixed(6));
    location.longitud=Number(location.longitud.toFixed(6));
  });
  return {
    schemaVersion:2,
    metricas:{
      ingresos:monthlyVisits.at(-1).ventas,
      clientesActivos:activeCustomers,
      recompensas:visits.filter(visit=>visit.premioCanjeado&&new Date(visit.fecha).getMonth()===today.getMonth()).length,
      visitas:monthlyVisits.at(-1).visitas,
      mensual:monthlyVisits,
      categorias:Object.entries(categoryCounts).map(([nombre,valor])=>({
        nombre:({
          Cafetería:"Cafeterías",
          Repostería:"Reposterías",
          Barbería:"Barberías",
          Restaurante:"Restaurantes",
          Confitería:"Confiterías"
        })[nombre]||nombre,
        valor:Math.round(valor/customers.length*100)
      }))
    },
    clientes:customers,
    visitas:visits,
    canjes:visits.filter(visit=>visit.premioCanjeado),
    tarjetas:cards,
    ubicaciones:locations,
    resenas:reviews,
    geolocalizacion:{radio:500,ubicacionId:1},
    audiencias:[],
    configuracion:{
      marca:"Fidegresa",
      perfilNombre:"María González",
      perfilCorreo:"maria@fidegresa.com",
      perfilTelefono:"999 234 567",
      perfilFoto:null,
      plan:"Emprende",
      tema:"claro",
      colorPrincipal:"#603f2a",
      avisos:{inactivos:true,localesEnPausa:true,resenas:true,cumpleanos:true}
    }
  };
}
