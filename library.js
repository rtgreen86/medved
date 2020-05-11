let ops = 0;

function add(a, b) {
  ops++;
  return a + b;
}

function invert(a) {
  ops++;
  return -a;
}

function negative(a) {
  ops++
  if (a < 0) {
    return 1;
  }
  return 0;
}

function nand(a, b) {
  ops++
  if (a === 1 && b === 1) {
    return 0;
  }
  return 1;
}

function text(a) {
  ops++
  return a.split('');
}

function list(...args) {
  const res = [];
  for (const t of args) {
    if (typeof t === 'number') {
      res.push(t);
      continue;
    }
    if (typeof t === 'string') {
      res.push(...text(t));
      continue;
    }
    if (t.length !== undefined) {
      res.push(...list(...t));
      continue;
    }
  }
  return res;
};

function empty(list) {
  return list.length === 0 ? 1 : 0;
}

function head([h]) {
  return h !== undefined ? h : 0;
}

function tail([, ...t]) {
  return t;
}

function select(
  p,
  f1, f2
) {
  if (p) {
    f1()
  } else {
    f2();
  }
}

function out(a) {
  console.log(a);
}

function outStr(a) {
  console.log(a.join(''));
}

// translate

const m_СЛОЖ = (А, Б) => add(А, Б);
const m_ИНВ = (А) => invert(А);
const m_ОТР = (А) => negative(А);
const m_НЕИ = (А, Б) => nand(А, Б);
const m_ТЕКСТ = (А) => text(А);
const m_СПИСОК = (...args) => list(...args);
const m_ПУСТО = (С) => empty(С);
const m_ГОЛОВА = (С) => head(С);
const m_ХВОСТ = (С) => tail(С);
const m_ВЫБОР = (ПР, Ф1, Ф2) => select(ПР, Ф1, Ф2);
const m_ВЫВОД = (V) => out(V);
const m_ВЫВОДС = (V) => outStr(V);
