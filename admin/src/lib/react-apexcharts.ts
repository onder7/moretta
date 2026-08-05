import RAC from 'react-apexcharts';

// react-apexcharts 1.4.x sadece CJS dağıtıyor; Vite 8 default import'ta
// modül nesnesini ({ __esModule, default }) olduğu gibi verdiği için
// bileşeni .default'tan açmak gerekiyor.
const ReactApexChart = ((RAC as { default?: unknown }).default ?? RAC) as typeof RAC;

export default ReactApexChart;
