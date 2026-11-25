// Constantes económicas del Hito 1 en un solo lugar para balancear.
export const ECONOMY = {
  startCash: 500000,
  gameMinutesPerRealSecond: 24, // 1 día de juego = 60 s reales a 1x
  cashierBaseRate: 14, // clientes por hora con 0 estrellas
  cashierRatePerStar: 8, // +8 clientes/hora por estrella
  selfCheckoutRate: 18,
  selfCheckoutCost: 45000,
  salaryBase: 8200, // MXN al mes
  salaryPerStar: 1600,
  bonusRate: 0.1, // bono de desempeño: +10 % nómina
  bonusSpeed: 0.1, // +10 % velocidad en caja
  trainCostPerStar: 6000,
  queueTolerance: 5, // arriba de 5 personas sube el abandono
  patienceMin: [6, 13] as [number, number], // minutos de juego que aguanta en fila
  shrinkBase: 0.025, // merma y robo hormiga
  shrinkBySecurity: [0.025, 0.014, 0.006],
  securityCost: [0, 45000, 120000], // cámaras y auditoría (inversión)
  securityMonthly: [0, 1500, 3500],
  cleaningMonthly: [0, 2500, 6000],
  cleaningSatisfaction: [0, 6, 12],
  kwhPrice: 3.4, // tarifa comercial CFE por kWh
  restockLeadMinutes: 360, // el mayorista tarda 6 h
  restockFee: 650, // flete por pedido
  wholesaleCostMult: 1.0, // Fase 1: compra a mayoristas
  reorderThreshold: 0.35,
  loanRate: 0.18, // crédito PyME anual
  loanLimitBase: 300000,
  quitChanceWeekly: 0.04,
  quitChanceWeeklyBonus: 0.02
}
