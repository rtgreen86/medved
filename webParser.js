function input() {
  const element = document.getElementById('input');
  if (Number.isFinite(+element.value)) {
    return [+element.value];
  }
  return element.value.split('')
}

function output(msg) {
  const element = document.getElementById('console')
  element.innerText += '\n' + msg;
}

function clear() {
  document.getElementById('console').innerText = '';
}

function execute(fn) {
  try {
    const res = fn(input());
    if (res && res.length !== undefined) {
      document.getElementById('result').value = res.join('');
      return;
    }
    document.getElementById('result').value = res;
  } catch (e) {
    document.getElementById('result').value = '';
    output(`Ошибка времени исполнения ${e.message}`);
  }
}


const header = `const data = [1, 2, 3, 4, 5];
/*library*/
const run = (fn) => execute(fn);
const ПРИМ = (F, ...args) => () => F(...args);
const ПРОЦ = (F, ...FNs) => FNs.reduce((a, f) => f(a), F());
const РАВН = (A, B) => A !== B ? 0 : 1;
const СЛОЖ = (A, B) => A + B;
const ВАР = (P, F1, F2) => P !== 0 ? F1() : F2();
const ДЛН = (A) => A.length;
const НАЧ = ([A]) => A;
const ХВОСТ = ([, ...L]) => L;
const СОЕД = (L1, L2) => [...L1, ...L2];
const ТЕКСТ = (v) => v.split('');
const ЧИСЛО = (v) =>
  Number.isFinite(+v)
    ? Math.floor(
      Math.max(
        -1000,
        Math.min(1000, v)
      )
    )
    : 0;
const ВЫВОД = (v) => {
  if (typeof v === 'number' || typeof v === 'string') {
    output(v);
    return;
  }
  if (v.length !== undefined) {
    output(v.join(''))
  }
}
// code
`;

const letters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЬЫЪЭЮЯ';

const numConst = `\\d+`;
const sym = `[${letters}][${letters}\\d]*`;
const operators = `=>|\\(|\\)|,`;
const spaces = `[\\s]+`;
const linebreak = `\\r?\\n`;
const comment = `#[^\\n]*\\n`;
const textConst = '"[^"]*"';

function * tokenize(buffer) {
  const tokenRX = new RegExp(
    `(${numConst})|` +
    `(${textConst})|` +
    `(${sym})|` +
    `(${operators})|` +
    `(${linebreak})|` +
    `(${spaces})|` +
    `(${comment})|` +
    '[\\s\\S]', // wroing symbol
    'g'
  );
  let token;
  while ((token = tokenRX.exec(buffer)) !== null) {
    yield {
      text: token[0],
      index: token.index
    };
  }
}

const symbolRx = new RegExp(`^${sym}$`);
const constRx = new RegExp(
  `(^${numConst}$)|` +
  `(^${textConst}$)`
);
const textConstRx = new RegExp(numConst);
const opRx = new RegExp(operators);
const linebrRx = new RegExp(linebreak);
const skipTokensRx = new RegExp(
  `(^${linebreak}$)|` +
  `(^#)|` +
  `(^${spaces}$)`
);

const symbols = new Set([
  'ПРИМ', 'ПРОЦ', 'РАВН', 'СЛОЖ',
  'ВАР', 'ДЛН', 'НАЧ', 'ХВОСТ',
  'СТАРТ', 'СТОП', 'ПУСТЬ',
  'ТЕКСТ', 'ЧИСЛО', 'ВЫВОД',
  'НЕИ', 'НЕГ', 'СОЕД', 'СТР'
]);

class JsBuilder {
  constructor(globals) {
    this.buffer = [];
    this.globals = new Set(globals);
    this.locals = new Set();
    this.error = null;
    this.line = 1;
    this.brackets = 0;
    this.firstInst = true;
  }

  header() {
    this.buffer.push(header);
  }

  addError(message) {
    this.error = new Error(`${message} в строке ${this.line}.`);
  }

  addEndInst() {
    if (!this.firstInst) {
      this.buffer.push(');\n');
    }
    this.firstInst = false;
  }

  defStart() {
    if (this.brackets > 0) {
      this.addError('Незакрыта скобка');
      return;
    }
    this.locals.clear();
    this.buffer.push('const ');
  }

  checkSym(token) {
    if (token.length > 5) {
      this.addError('Длинна СИМВОЛА привышает ГОСТ*');
      return;
    }
    if (this.globals.has(token) || this.locals.has(token)) {
      this.addError(`Невозможно переопределить СИМВОЛ «${token}»`);
      return;
    }
  }

  defGlobalSym(token) {
    this.checkSym(token);
    if (this.error) return;
    this.globals.add(token);
    this.buffer.push(token, '=');
  }

  defLocalSym(token) {
    this.checkSym(token);
    if (this.error) return;
    this.locals.add(token);
    this.buffer.push(token);
  }

  addOp(token) {
    if (token === '(') {
      this.brackets++;
    }
    if (token === ')') {
      this.brackets--;
    }
    if (this.brackets < 0) {
      this.addError('Количество закрытых скобок нарушают ГОСТ*');
      return;
    }
    this.buffer.push(token);
    if (token === '=>') {
      this.buffer.push('(');
    }
  }

  addSym(token) {
    if (token.length > 5) {
      this.addError('Длинна СИМВОЛА привышает ГОСТ*');
      return;
    }
    if (!this.globals.has(token) && !this.locals.has(token)) {
      this.addError(`Неизвестный СИМВОЛ «${token}»`);
      return;
    }
    this.buffer.push(token);
  }

  addBr() {
    this.line++;
  }

  addRun() {
    this.buffer.push('run');
  }
}

class TranslateDirector {
  constructor(builder) {
    this.builder = builder;
    this.state = 0;
    this.builder.header();
  }

  process(token) {
    if (this.builder.error) {
      return;
    }

    if (linebrRx.test(token)) {
      this.builder.addBr();
    }
    if (skipTokensRx.test(token)) {
      return;
    }

    switch(this.state) {
      case 0:
        if (token === 'ПУСТЬ') {
          this.builder.addEndInst();
          this.builder.defStart();
          this.state = 1;
          return;
        }
        if (token === 'СТАРТ') {
          this.builder.addEndInst();
          this.builder.addRun();
          return;
        }
        if (symbolRx.test(token)) {
          this.builder.addSym(token);
          return;
        }
        if (token === '=>') {
          this.builder.addError(`Ввод ${token} не соответствует ГОСТ*`);
        }
        if (opRx.test(token) || constRx.test(token)) {
          this.builder.addOp(token);
          return;
        }
        this.builder.addError(`Ввод ${token.substring(0, 10)}... не соответствует ГОСТ*`);
        return;

      case 1:
        if (symbolRx.test(token)) {
          this.builder.defGlobalSym(token);
          this.state = 2;
          return;
        }
        this.builder.addError(`Должен быть СИМВОЛ`);
        return;

      case 2:
        if (token === '(') {
          this.builder.addOp(token);
          this.state = 3;
          return;
        }
        this.builder.addError(`Должна быть (`);
        return;

      case 3:
        if (symbolRx.test(token)) {
          this.builder.defLocalSym(token);
          return;
        }
        if (token === ',') {
          this.builder.addOp(token);
          return;
        }
        if (token === ')') {
          this.builder.addOp(token);
          this.state = 4;
          return;
        }
        this.builder.addError(`Прерванно объявление СИМВОЛА`);
        return;

      case 4:
        if (token === '=>') {
          this.builder.addOp(token);
          this.state = 0;
          return;
        }
        this.builder.addError(`По ГОСТ* требуется =>`);
        return;
    }
  }
}

document.getElementById('start').addEventListener('click', function (event) {
  event.preventDefault();
  clear();
  const content = document.getElementById('code').value;
  const jsb = new JsBuilder(symbols);
  const dir = new TranslateDirector(jsb);
  for (const token of tokenize(content)) {
    const { text } = token;
    dir.process(text);
  }
  if (jsb.error) {
    output(jsb.error.message);
    return;
  }
  const result = jsb.buffer.join('');
  eval(result);
});
