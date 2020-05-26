const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numConst = `\\d+`;
const sym = `[${letters}][${letters}\\d]*`;
const operators = `=|\\(|\\)|,|\\+|-|LET|RUN|IF|THEN|ELSE`;
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

module.exports.tokenize = tokenize;

