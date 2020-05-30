const fs = require('fs');
const { tokenize } = require('./lexer');


// --- Syntax analysis

const globals = [];

const maxSymLen = 6;

function checkSymLen(sym) {
  if (sym.length > maxSymLen) {
    return `Длинна ${sym.substring(0, 10)}... привышает нормы ГОСТ* ${maxSymLen} символов.`;
  }
  return null;
}

function checkNewSym({ globals, locals }, sym) {
  const lenErr = checkSymLen(sym);
  if (lenErr) return lenErr;
  if (globals.has(sym) || locals.has(sym)) {
    return `Невозможно переопределить ${sym}.`;
  }
  return null;
}

function checkExistSym({ globals, locals }, sym) {
  const lenErr = checkSymLen(sym);
  if (lenErr) return lenErr;
  if (!locals.has(sym) && !globals.has(sym)) {
    return `Неизвестный символ ${sym}.`;
  }
  return null;
}

function error(line, message) {
  return new Error(`Строка ${line}: ${message}`);
}

function addNewGlobalSymbol(
  { stack, globals, locals, line },
  sym
) {
  const err = checkNewSym({ globals, locals }, sym);
  if (err) throw error(line, err);
  globals.add(sym);
  stack.push(sym);
  return { globals, stack }
}

function addNewLocalSymbol(
  { stack, locals, globals, line },
  sym
) {
  const err = checkNewSym({ globals, locals }, sym);
  if (err) throw error(line, err);
  locals.add(sym);
  stack.push(sym);
  return { locals, stack };
}

function addExistSymbol( { stack, line, globals, locals }, sym) {
  const err = checkExistSym({ globals, locals }, sym);
  if (err) throw error(line, err);
  stack.push(sym);
  return { stack };
}

function checkNum(sym) {
  const val = +sym;
  if (!Number.isFinite(val) || val > 1000) {
    return `Допускаются числовые литералы от 0 до 999.`;
  }
}

function oprWeight(op) {
  switch(op.toUpperCase()) {
    case 'RUN' :
    case 'LET' : return 10;
    case '='   : return 20;
    case ')'   : return 30;
    case 'IF'  :
    case 'THEN':
    case 'ELSE': return 40;
    case ','   : return 50;
    case '+'   :
    case '-'   : return 60;
    case '('   : return 70;
  }
}

function fold(stack) {
  const opr2 = stack.pop();
  const rval = stack.pop();
  if (stack.length === 0 && opr2 === 'EOF') {
    stack.push(rval);
    return stack;
  }
  if (stack.length === 0) {
    stack.push(rval, opr2);
    return stack;
  }

  const opr1 = stack.pop();
  if (
    (opr1 === 'IF' && opr2 === 'THEN') ||
    (opr1 === 'THEN' && opr2 === 'ELSE')
  ) {
    stack.push(opr1, rval, opr2);
    return stack;
  }
  if (opr1 === '(' && opr2 === ')') {
    stack.push('[' + opr1 + rval + opr2 + ']');
    return stack;
  }
  if (
    opr1 === '(' ||
    opr1 === 'IF' ||
    opr1 === 'THEN'
  ) {
    stack.push(opr1, rval, opr2);
    return stack;
  }

  const lval = stack.pop();
  if (rval === 'EOF') {
    stack.push(lval, opr1, rval);
    return stack;
  }
  if (oprWeight(opr1) < oprWeight(opr2)) {
    stack.push(lval, opr1, rval, opr2);
    return stack;
  }
  if (opr1 === 'ELSE') {
    stack.pop(); // then keyword
    const condition = stack.pop();
    stack.pop(); // if keyword
    stack.push(`select((${condition}),(${lval}),(${rval}))`, opr2);
    return fold(stack);
  }

  stack.push('[' + lval + opr1 + rval + ']', opr2);
  return fold(stack);
}


function parser(
  {
    stack = [],
    locals = new Set(),
    globals = new Set(),
    line = 0,
    state = 'lvalue'
  },
  {
    type,
    text
  }
) {
  if (type === 'BR') {
    line++;
  }
  if (
    type === 'BR' ||
    type === 'SPACE' ||
    type === 'COMMENT'
  ) {
    return {stack, locals, globals, line, state};
  }
  if (type !== 'EOF') {
    text = text.toUpperCase();
  }
  switch(state) {
    case 'lvalue':
      if (type === 'NUM_CONST') {
        stack.push(text);
        state = 'operator';
        break;
      }
      if (
        text === 'IF' ||
        text === '('
      ) {
        stack.push(text);
        break;
      }
      throw error(line, 'Неправильное левое значение');
    case 'operator':
      if (text === ')') {
        stack.push(text);
        stack = fold(stack);
        break;
      }
      if (
        text === 'THEN' ||
        text === 'ELSE'
      ) {
        stack.push(text);
        stack = fold(stack);
        state = 'lvalue';
        break;
      }
      if (type === 'OPERATOR') {
        stack.push(text);
        stack = fold(stack);
        state = 'rvalue';
        break;
      }
      if (type === 'EOF') {
        stack.push(type);
        stack = fold(stack);
        break;
      }
      throw error(line, 'Неправильный оператор');
    case 'rvalue':
      if (
        text === '(' ||
        text === 'IF'
      ) {
        stack.push(text);
        state = 'lvalue';
        break;
      }
      if (type === 'NUM_CONST') {
        stack.push(text);
        state = 'operator';
        break;
      }
      throw error(line, 'Неправильное правое значние');
  }
  return {stack, locals, globals, line, state};
}

// -------

(function test1() {
  const content = fs.readFileSync('expression-parser-input.dat', 'utf8');
  const tokens = [...tokenize(content)];
  const { stack: expr } = tokens.reduce(
    parser,
    {
      globals: new Set(globals)
    }
  );
  console.log(expr[0]);
  console.log('[1,[[([2,[3+[(3)]]])]-5]]' === expr[0], 'Complete!')
}());

(function test2() {
  const content = fs.readFileSync('expression-parser-input-2.dat', 'utf8');
  const tokens = [...tokenize(content)];
  const { stack: expr } = tokens.reduce(
    parser,
    {
      globals: new Set(globals)
    }
  );
  console.log(expr[0]);
  console.log('select(([1-1]),(1),(0))' === expr[0], 'Complete!')
}());
