let easteregg = ""
document.querySelector("body").addEventListener("keyup", (e) => {
    easteregg += e.key;
    if (e.key == "Enter") {
        easteregg = "";
    };
    console.log(easteregg);
    if (easteregg == "tetris") {
        alert("parabens");
    }
});