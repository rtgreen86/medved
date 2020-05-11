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

const m_ТЕСТ = function () {
  const m_Ф1 = () => (2);
  const m_Ф2 = (m_ИКС) => (m_ИКС);
  const m_УДВ = (m_ИКС) => (m_СЛОЖ(m_ИКС,m_ИКС));
  const m_Ф3 = () => (m_УДВ);
  const m_Ф4 = (m_ИКС,m_Ф) => (m_Ф(m_ИКС));
  const m_Ф5 = () => (m_СПИСОК(1,m_Ф2(m_Ф1())));
  const m_Ф6 = (m_ИКС) => (m_СПИСОК(m_ИКС,m_Ф4(m_Ф1(),m_УДВ),5,m_Ф3()(m_ИКС)));
  const m_Ф7 = () => (m_Ф6(3));
  const m_Ф8 = () => (m_СПИСОК(m_Ф5(),m_Ф7()));
  const m_Ф9 = () => (m_СПИСОК(m_Ф8(),7));
  const m_ФС1 = () => (m_ТЕКСТ("Привет Мир! "));
  const m_ФС2 = () => (m_ТЕКСТ("Привет "));
  const m_ФС3 = (m_ИМЯ) => (m_ИМЯ);
  const m_ФС4 = (m_ИМЯ) => (m_СПИСОК(m_ФС1(),m_ФС2(),m_ФС3(m_ИМЯ)));
  const m_Ф = (m_ИМЯ) => (m_ВЫВОДС(m_ФС4(m_ИМЯ)),m_ВЫВОД(m_Ф9()),0);
  return m_Ф;
}();

m_ТЕСТ(m_ТЕКСТ("Юзер"));
