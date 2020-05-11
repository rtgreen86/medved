const fs = require('fs');

// --- lexic analysis ---

const letters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЬЫЪЭЮЯ';
const numConst = `\\d+`;
const sym = `[${letters}][${letters}\\d]*`;
const operators = `=|\\(|\\)|,`;
const spaces = `[\\s]+`;
const linebreak = `\\r?\\n`;
const comment = `\\/\\/[^\\n]*\\n`;
const textConst = '"[^"]*"';

const tokens = {
  'NUM_CONST': `(${numConst})`,
  'TEXT_CONST': `(${textConst})`,
  'SYMBOL': `(${sym})`,
  'OPERATOR': `(${operators})`,
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
    'g'
  );
  let token;
  while ((token = tokenRX.exec(buffer)) !== null) {
    yield {
      text: token[0],
      index: token.index,
      type: getTokenType(tokenTypes, token).join()
    };
  }
}

// --- Syntax analysis

const keywords = [
  'ПУСТЬ', 'МОДУЛЬ', 'СТАРТ', 'СЕБЯ'
];

const globals = [
  'СЛОЖ', 'ИНВ', 'ОТР',
  'НЕИ', 'СПИСОК',
  'ГОЛОВА', 'ХВОСТ', 'ПУСТО',
  'ВЫБОР',
  'ВЫВОД', 'ВЫВОДС'
];

const prefix = 'm_';
const maxSymLen = 6;

function wrapSym(sym) {
  return `${prefix}${sym}`;
};

class JsBuilder {
  constructor(keywords, globals) {
    this.keywords = new Set(keywords);
    this.globals = new Set(globals);
    this.module = new Set();
    this.locals = new Set();

    this.moduleName = null;
    this.fnName = null;

    this.buffer = [];

    this.line = 1;
    this.brackets = 0;
  }

  error(message) {
    return new Error(`${message} в строке ${this.line}.`);
  }

  errorSymTooLong() {
    return this.error('Длинна СИМВОЛА привышает ГОСТ*');
  }

  errorSymUsed(name) {
    return this.error(`СИМВОЛ «${name}» уже определен`);
  }

  errorUnknownSym(name) {
    return this.error(`Неизвестный СИМВОЛ «${name.substring(0, 10)}...»`);
  }

  startModule(token) {
    if (this.moduleName !== null) {
      throw this.error('Модуль уже объявлен');
    }

    if (
      this.keywords.has(token) ||
      this.globals.has(token)
    ) {
      throw this.errorSymUsed(token);
    }

    if (token.length > maxSymLen) {
      throw this.errorSymTooLong();
    }

    this.moduleName = token;
    this.buffer.push(`const ${wrapSym(this.moduleName)} = function () {\n`);
  }

  endModule(funcName) {
    if (this.moduleName === null) return;

    if (
      !this.globals.has(funcName) &&
      !this.module.has(funcName)
    ) {
      throw this.errorUnknownSym(funcName);
    }

    this.buffer.push(`  return ${wrapSym(funcName)};\n}();\n`);
    this.globals.add(this.moduleName);
    this.moduleName = null;
    this.module.clear();
  }

  startFunction(token) {
    if (token.length > maxSymLen) {
      throw this.errorSymTooLong()
    }

    if (
      this.keywords.has(token) ||
      this.globals.has(token) ||
      this.module.has(token) ||
      this.moduleName === token
    ) {
      throw this.errorSymUsed(token);
    }

    this.fnName = token;
    this.buffer.push(`  const ${wrapSym(token)} = `);
    this.module.add(token);
  }

  endFunction() {
    if (this.fnName === null) return;

    if (this.brackets > 0) {
      throw this.error('Незакрыта скобка');
    }

    this.locals.clear();
    this.buffer.push(');\n');
    this.fnName = null;
  }

  addLocalSym(token) {
    if (token.length > maxSymLen) {
      throw this.errorSymTooLong()
    }

    if (
      this.keywords.has(token) ||
      this.globals.has(token) ||
      this.module.has(token) ||
      this.locals.has(token)
    ) {
      throw this.errorSymUsed(token);
    }

    this.locals.add(token);
    this.buffer.push(wrapSym(token));
  }

  newLine() {
    this.line++;
  }

  operator(token) {
    if (token === '=') {
      this.buffer.push(' => (');
      return;
    }
    if (token === '(') {
      this.brackets++;
    }
    if (token === ')') {
      this.brackets--;
    }
    if (this.brackets < 0) {
      throw this.error('Количество закрытых скобок нарушают ГОСТ*');
      return;
    }
    this.buffer.push(token);
  }

  token(token) {
    this.buffer.push(token);
  }

  symbol(token) {
    if (
      !this.keywords.has(token) &&
      !this.globals.has(token) &&
      !this.module.has(token) &&
      !this.locals.has(token)
    ) {
      throw this.errorUnknownSym(token);
    }

    this.buffer.push(wrapSym(token));
  }

  addNumConst(token) {
    const val = +token;
    if (
      !Number.isFinite(val) ||
      val > 1000
    ) {
      throw this.error('Числовая константа нарушает ГОСТ*');
    }
    this.buffer.push(val);
  }

  addTextConst(token) {
    this.buffer.push(`${prefix}ТЕКСТ(${token})`);
  }

  self() {
    this.buffer.push(wrapSym(this.fnName));
  }
}

class TranslateDirector {
  constructor(builder) {
    this.builder = builder;
    this.state = 0;
  }

  process({text, type}) {
    if (type === 'BR' || type === 'COMMENT') {
      this.builder.newLine();
      return;
    }
    if (type === 'SPACE') {
      return;
    }

    switch(this.state) {
      // root cases 0 - 10
      case 0:
        if (text === 'МОДУЛЬ') {
          this.state = 1;
          return;
        }
        throw this.builder.error('По ГОСТ* ождидается объявление');
      case 1:
        if (type === 'SYMBOL') {
          this.builder.startModule(text);
          this.state = 10;
          return;
        }
        throw this.builder.error('По ГОСТ* ождидается имя модуля');

      // in module 10 - 20
      case 10:
        if (text === 'ПУСТЬ') {
          this.state = 20;
          return;
        }
        if (token === 'СТАРТ') {
          this.state = 40;
          return;
        }
        throw this.builder.error('По ГОСТ* ождидается объявление');

      // function definition cases 20 - 30
      case 20:
        if (type === 'SYMBOL') {
          this.builder.startFunction(text);
          this.state = 21;
          return
        }
        throw this.builder.error('По ГОСТ* ождидается имя функции');
      case 21:
        if (text === '(') {
          this.builder.operator(text);
          this.state = 22;
          return;
        }
        throw this.builder.error('По ГОСТ* ожидаются параметры функции');
      case 22:
        if (text === ')') {
          this.builder.operator(text);
          this.state = 25;
          return;
        }
        if (type === 'SYMBOL') {
          this.builder.addLocalSym(text);
          this.state = 23;
          return;
        }
        throw this.builder.error('По ГОСТ* ожидаются параметры функции');
      case 23:
        if (text === ')') {
          this.builder.operator(text);
          this.state = 25;
          return;
        }
        if (text === ',') {
          this.builder.operator(text);
          this.state = 24;
          return;
        }
        throw this.builder.error('По ГОСТ* ожидаются параметры функции');
      case 24:
        if (type === 'SYMBOL') {
          this.builder.addLocalSym(text);
          this.state = 23;
          return;
        }
        throw this.builder.error('По ГОСТ* ожидаются параметры функции');
      case 25:
        if (text === '=') {
          this.builder.operator(text);
          this.state = 30;
          return;
        }
        throw this.builder.error('По ГОСТ* ожидаются объявление функции');

      // In function cases 30 - 40
      case 30:
        if (text === 'ПУСТЬ') {
          this.builder.endFunction();
          this.state = 20;
          return;
        }
        if (text === 'СЕБЯ') {
          this.builder.self();
          return;
        }
        if (text === 'СТАРТ') {
          this.builder.endFunction();
          this.state = 40;
          return;
        }
        if (type === 'NUM_CONST') {
          this.builder.addNumConst(text);
          return;
        }
        if (type === 'TEXT_CONST') {
          this.builder.addTextConst(text);
          return;
        }
        if (type === 'SYMBOL') {
          this.builder.symbol(text);
          return;
        }
        if (type === 'OPERATOR') {
          this.builder.operator(text);
          return;
        }
        throw this.builder.error('Ввод не соответсвует ГОСТ*');

      // End module cases 40 - 50
      case 40:
        if (type === 'SYMBOL') {
          this.builder.endModule(text);
          this.state = 0;
          return;
        }
        throw this.builder.error('По ГОСТ* ождидается имя функции');
    }
  }
}

const content = fs.readFileSync('input.dat', 'utf8');
const jsb = new JsBuilder(keywords, globals);
const dir = new TranslateDirector(jsb);
for (const token of tokenize(content)) {
  dir.process(token);
}

const result = jsb.buffer.join('');

fs.writeFileSync('output.js', result, 'utf8');
console.log('Complete!')
