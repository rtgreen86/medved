const data = [1, 2, 3, 4, 5];
/*library*/
const IN1 = () => {
  console.log('ВХОД: ', data);
  return data;
};
const run = (fn) => {
  console.log('ВЫВОД:', fn(IN1()));
};
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
    console.log(v);
    return;
  }
  if (v.length !== undefined) {
    console.log(v.join(''))
  }
}
// code
const Т1=()=>(ТЕКСТ("ПРИВЕТ МИР! "));
const Т2=()=>(ТЕКСТ("ЭТО ПРОСТАЯ ПРОГРАММА"));
const ОТВЕТ=()=>(ВЫВОД(СОЕД(Т1(),Т2())),0);
run(ОТВЕТ)