const formula = require('excel-formula')
const formulajs = require('formulajs')

var Calc = new Object();
Calc.options = {
  tmplFunctionStart: 'Calc.func("{{token}}", ',  // '{{autoindent}}{{token}}(\n',
  tmplFunctionStop: '{{token}})', // '{{token}})',
  tmplOperandError: '{{token}}',
  tmplOperandRange: 'Calc.range("{{token}}")',  // '{{token}}',
  tmplOperandLogical: 'Calc.logical({{token}})',
  tmplOperandNumber: 'Calc.number({{token}})',
  tmplOperandText: '"{{token}}"',
  tmplArgument: '{{token}}',
  tmplOperandOperatorInfix: '{{token}}',
  tmplFunctionStartArray: "",
  tmplFunctionStartArrayRow: "{",
  tmplFunctionStopArrayRow: "}",
  tmplFunctionStopArray: "",
  tmplSubexpressionStart: "(",
  tmplSubexpressionStop: ")",
  tmplIndentTab: "\t",
  tmplIndentSpace: " ",
  autoLineBreak: "TOK_SUBTYPE_STOP | TOK_SUBTYPE_START | TOK_TYPE_ARGUMENT",
  trim: true,
  // customTokenRender: tokRender
};
Calc.func = function(funName, args){
  console.log(funName);
  if(funName == "")
    return arguments[1];
  var args = Array.prototype.slice.call(arguments, 1);
  var argIndex = 0;
  for(argIndex =0; argIndex < args.length; argIndex++){
    args[argIndex] + "";
  }
  var retValue = formulajs[funName].apply(null, args);
  return retValue;
}

Calc.range = function(str_range){
  console.log("Calc.range : " + str_range);
  var value = GridDB.getByCellName(str_range);
  return value;
}

Calc.logical = function(str){
  console.log("Calc.logical : " + logical);
}

Calc.number = function(arg_num){
  console.log("Calc.number : " + arg_num);
  return arg_num;
}

Calc.arg = function(arg_arg){
  console.log("Calc.arg : " + arg_arg);
  return arg_arg;
}

Calc.text = function(str){
  console.log("Calc.text : " + str);
  return str;
}

Calc.toJavaScript = function(str_formula){
  return formula.toJavaScript(str_formula, this.options);
}

var _formula1 = 'IF(A1=2,"true","false")'
js_formula1 = Calc.toJavaScript(_formula1);

var _formula2 = 'FV(B3, 10000, 2)'
js_formula2 = Calc.toJavaScript(_formula2);

var _formula3 = 'SUM(A2:A5)'
js_formula3 = Calc.toJavaScript(_formula3);
