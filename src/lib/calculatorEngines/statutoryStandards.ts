import { LegalCalculatorConfig } from '../../types/legalTools';

/**
 * 行政院主計總處 113年度 各縣市平均每人每月消費支出標準
 *
 * 基準年度必須一併揭露。主計總處每年公布新的消費支出標準，
 * 未更新資料時若不標示年度，使用者會把兩年前的數字當成現值，
 * 而這項金額會進入扶養費的實際計算並可能被寫進書狀。
 *
 * 已揭露年度不代表資料為最新；要更新數值時，
 * 請一併更新此常數名稱與 REGIONAL_LIVING_EXPENSES_BASIS_YEAR。
 */
export const REGIONAL_LIVING_EXPENSES_BASIS_YEAR = '113 年度';
export const REGIONAL_LIVING_EXPENSES_113: Record<string, { name: string; amount: number }> = {
  TAIPEI: { name: '臺北市', amount: 34321 },
  NEW_TAIPEI: { name: '新北市', amount: 25303 },
  TAOYUAN: { name: '桃園市', amount: 25156 },
  TAICHUNG: { name: '臺中市', amount: 26526 },
  TAINAN: { name: '臺南市', amount: 22695 },
  KAOHSIUNG: { name: '高雄市', amount: 25287 },
  HSINCHU_CITY: { name: '新竹市', amount: 29845 },
  HSINCHU_COUNTY: { name: '新竹縣', amount: 26892 },
  MIAOLI: { name: '苗栗縣', amount: 21950 },
  CHANGHUA: { name: '彰化縣', amount: 20850 },
  NANTOU: { name: '南投縣', amount: 21200 },
  YUNLIN: { name: '雲林縣', amount: 20100 },
  CHIAYI_CITY: { name: '嘉義市', amount: 23500 },
  CHIAYI_COUNTY: { name: '嘉義縣', amount: 19800 },
  PINGTUNG: { name: '屏東縣', amount: 21100 },
  YILAN: { name: '宜蘭縣', amount: 22350 },
  HUALIEN: { name: '花蓮縣', amount: 21900 },
  TAITUNG: { name: '臺東縣', amount: 20450 },
  PENGHU: { name: '澎湖縣', amount: 20800 },
  KINMEN: { name: '金門縣', amount: 21500 },
  LIENCHIANG: { name: '連江縣', amount: 21500 },
};

/**
 * 民事訴訟裁判費標準費率計算 (依民事訴訟法第77條之13)
 */
export function calculateCourtFee(
  claimAmount: number,
  instance: 'first' | 'second_third' | 'payment_order' = 'first',
  /**
   * 一審裁判費是否已依民訴§77-9 酌減。
   * §77-16 的加徵比例以此為前提：一審已酌減者，二審以酌減後金額加徵 5/10；
   * 未酌減者，原則上為一審裁判費之半。兩者金額差距可達數倍，
   * 不可視為同一種情形。
   */
  firstInstanceFeeReduced = true
): {
  fee: number;
  basisRule: string;
} {
  if (instance === 'payment_order') {
    return { fee: 500, basisRule: '民事訴訟法第77條之19：聲請支付命令徵收裁判費新臺幣500元' };
  }

  let firstInstanceFee = 0;
  if (claimAmount <= 0) {
    firstInstanceFee = 0;
  } else if (claimAmount <= 100000) {
    // 司法院「民事事件費用徵收標準」：10萬元以下部分 1,500 元。
    // 先前實作為 1,000 元，與官方表不符。
    firstInstanceFee = 1500;
  } else {
    // 費率取自司法院「民事事件費用徵收標準」（民訴§77-13）對照表：
    //   逾10萬元～100萬元部分   每萬元 130 元
    //   逾100萬元～1000萬元部分 每萬元 117 元
    //   逾1000萬元～1億元部分   每萬元  88 元
    //   逾1億元～10億元部分    每萬元  77 元
    //   逾10億元部分            每萬元  66 元
    // 畸零之數不滿萬元者以萬元計算。
    //
    // 先前實作使用的是 100／90／80／70 元這組自創費率，與官方表不符，
    // 且未隨法規更新。以 1 億元標的為例，舊值 811,000 元，官方表為 910,500 元；
    // 差額會直接影響使用者對訴訟成本的預估。
    let remaining = claimAmount;
    let fee = 1500; // 0 - 100,000 部分
    remaining -= 100000;

    const 級距: Array<[額度: number, 單價: number]> = [
      [900000, 130],    // 10萬～100萬
      [9000000, 117],   // 100萬～1000萬
      [90000000, 88],   // 1000萬～1億
      [900000000, 77],  // 1億～10億
      [Infinity, 66]    // 逾10億
    ];
    for (const [額度, 單價] of 級距) {
      if (remaining <= 0) break;
      const 取 = Math.min(remaining, 額度);
      fee += Math.ceil(取 / 10000) * 單價;
      remaining -= 取;
    }

    firstInstanceFee = fee;
  }

  if (instance === 'second_third') {
    const fee = firstInstanceFeeReduced
      ? Math.round(firstInstanceFee * 1.5)
      : Math.round(firstInstanceFee / 2);
    return {
      fee,
      basisRule: firstInstanceFeeReduced
        ? '民事訴訟法第77條之16：一審裁判費已依第77條之9酌減者，以酌減後之裁判費為基礎加徵十分之五'
        : '民事訴訟法第77條之16：一審裁判費未依第77條之9酌減者，原則上按第一審裁判費二分之一計算'
    };
  }

  return {
    fee: firstInstanceFee,
    // 司法院同一張表附註5明確警告：各法院得依民訴§77-27 提高徵收額數
    // （例如臺灣高等法院自113年底起對10萬元以下加徵十分之五、
    //   10萬至1000萬加徵十分之三、逾1000萬加徵十分之一）。
    // 因此本試算為法定起算基礎，實際應繳金額須以受理法院的核定為準。
    basisRule:
      '民事訴訟法第77條之13：因財產權而起訴之分級累進費率。' +
      '本值為法定基礎額；依同法第77條之27，各法院得提高徵收額數' +
      '（例如臺灣高等法院對10萬元以下加徵十分之五、10萬至1000萬加徵十分之三、' +
      '逾1000萬加徵十分之一），實際應繳金額請以受理法院核定為準，' +
      '或查詢司法院民事裁判費試算表 gdgt.judicial.gov.tw/judtool/wkc/GDGT23.htm。'
  };
}

/**
 * 格式化金額千分位
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
}
