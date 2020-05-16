const fs = require('fs');

// --- lexic analysis ---

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numConst = `\\d+`;
const sym = `[${letters}][${letters}\\d]*`;
const operators = `=|\\(|\\)|,|\\+|-|\\?|:|LET|RUN`;
const spaces = `[\\s]+`;
const linebreak = `\\r?\\n`;
const comment = `\\/\\/[^\\n]*\\n`;
const textConst = '"[^"]*"';

const tokens = {
  'NUM_CONST': `(${numConst})`,
  'TEXT_CONST': `(${textConst})`,
  'OPERATOR': `(${operators})`,
  'SYMBOL': `(${sym})`,
  'BR': `(${linebreak})`,
  'SPACE': `(${spaces})`,
  'COMMENT': `(${comment})`,
  'UNKNOWN': '[\\s\\S]'
}

function getTokenType(types, rxRes) {
  return Array.from(rxRes)
    .slice(1) // skip substring, use only groups
    .map((item, index) => item === undefined ? undefined : index)
    .filter(item => item !== undefined)
    .map(idx =>
      types.length > idx
        ? types[idx]
        : ''
    );
}

function * tokenize(buffer) {
  const tokenTypes = Object.keys(tokens);
  const tokenRX = new RegExp(
    tokenTypes.map(t => tokens[t]).join('|'),
    'gi'
  );
  let token;
  while ((token = tokenRX.exec(buffer)) !== null) {
    yield {
      text: token[0],
      index: token.index,
      type: getTokenType(tokenTypes, token).join()
    };
  }
  yield {
    index: buffer.length,
    type: 'EOF'
  };
}

// --- Syntax analysis

const keywords = [
  'ПУСТЬ', 'МОДУЛЬ', 'СТАРТ', 'СЕБЯ'
];

const globals = [
  'ISNEG',
  'NAND',
  'LIST', 'HEAD', 'TAIL', 'EMPTY',
  'OUT', 'OUTSTR'
];

function binOperator(stack) {
  const rv = stack.pop();
  const op = stack.pop();
  const lv = stack.pop();
  stack.push({op, lv, rv});
  return stack;
}

function ternaryOperator(stack) {
  const expr3 = stack.pop();
  const expr2 = stack.pop();
  const expr1 = stack.pop();
  stack.push({ op: '?:', expr1, expr2, expr3 });
  return stack;
}

function syntax(
  {
    state = 0,
    stack
  },
  {
    type, text
  }
) {
  switch(state) {
    case 'expression':
      if (type === 'EOF') {
        return { state, stack };
      }
      if (type === 'SYMBOL' || type === 'NUM_CONST') {
        stack.push(text);
        state = 'lvalue';
        return { state, stack };
      }
      throw new Error('Ожидается символ');

    case 'lvalue':
      if (type === 'EOF') {
        return { state, stack };
      }
      if (text === '+' || text === '-') {
        stack.push(text);
        state = 'operator';
        return { state, stack };
      }
      throw new Error('Ожидается оператор');

    case 'operator':
      if (type === 'SYMBOL' || type === 'NUM_CONST') {
        stack.push(text);
        state = 'rvalue';
        return { state, stack };
      }
      throw new Error('Ожидается символ');

    case 'rvalue':
      if (
        type === 'EOF' ||
        text === '+' || text === '-'
      ) {
        stack = binOperator(stack);
      }
      if (type === 'EOF') {
        state = null;
        return { state, stack };
      }
      if (text === '+' || text === '-') {
        stack.push(text);
        state = 'operator';
        return { state, stack };
      }
      throw new Error('Ожидается оператор');

    default:
      throw new Error('Ошибка разбора');
  }
}

function generator(tree) {
  if (typeof tree === 'string') {
    return [tree];
  }
  if (tree.op === '+' || tree.op === '-') {
    return [
      tree.op === '+' ? 'add(' : 'sub(',
      ...generator(tree.lv),
      ',',
      ...generator(tree.rv),
      ')'
    ]
  }
  return [];
}


// -------

const content = fs.readFileSync('input2.dat', 'utf8');
const { stack: tree } = [...tokenize(content)].reduce(
  syntax,
  {
    state: 'expression',
    stack: []
  }
);
const text = generator(tree[0]).join('');
console.log(text);
console.log('Complete!')
