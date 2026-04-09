let chart;

function drawProfitChart(canvasId, investment, value){

let ctx = document.getElementById(canvasId);

if(chart){
chart.destroy();
}

let profit = value - investment;

let finalColor;

if(profit >= 0){
finalColor = '#22c55e'; // profit
}else{
finalColor = '#ef4444'; // loss
}

chart = new Chart(ctx,{
type:'bar',
data:{
labels:['Invested','Current Value'],
datasets:[{
data:[investment,value],
backgroundColor:[
'#3b82f6',
finalColor
]
}]
},
options:{
responsive:true,
plugins:{
legend:{display:false}
}
}
});

}
