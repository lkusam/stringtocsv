// Need a function to read the input string split it on seperator and return in CSV format

function readInputString(inputString, seperator) {
  let temp = inputString.split(seperator);
  temp = temp.map((item) => `'${item.trim()}'`);
  temp = temp.filter((item) => item !== `''`);
  return temp.join(",\n");
}

// Copy from output method
function copyToClipboard() {
  var copyText = document.getElementById("output");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("Copied the text: " + copyText.value);
}

function convert() {
  let inputString = document.getElementById("input").value;
  let seperator = document.getElementById("seperator").value;
  let sep = getseperator(seperator);
  let outputString = readInputString(inputString, sep);
  document.getElementById("output").value = outputString;
}

function getseperator(sep) {
  let sepratorSymbl;
  switch (sep) {
    case "newline":
      sepratorSymbl = "\n";
      break;
    case "comma":
      sepratorSymbl = ",";
      break;
    case "space":
      sepratorSymbl = " ";
      break;

    default:
      sepratorSymbl = "\n";
      break;
  }
  return sepratorSymbl;
}

clearOutPut = () => {
  document.getElementById("output").value = "";
};

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("convert").addEventListener("click", convert);
  document.getElementById("copy").addEventListener("click", copyToClipboard);
  document.getElementById("clear").addEventListener("click", clearOutPut);
});
