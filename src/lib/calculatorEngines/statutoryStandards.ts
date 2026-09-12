import { LegalCalculatorConfig } from '../../types/legalTools';

/**
 * 行政院主計總處 113年度 各縣市平均每人每月消費支出標準
 */
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
export function calculateCourtFee(claimAmount: number, instance: 'first' | 'second_third' | 'payment_order' = 'first'): {
  fee: number;
  basisRule: string;
} {
  if (instance === 'payment_order') {
    return { fee: 500, basisRule: '民事訴訟法第77條之19：聲請支付命令徵收裁判費新台幣500元' };
  }

  let firstInstanceFee = 0;
  if (claimAmount <= 0) {
    firstInstanceFee = 0;
  } else if (claimAmount <= 100000) {
    firstInstanceFee = 1000;
  } else {
    // 逾10萬元至100萬元部分：每萬元加徵100元 (1%)
    // 逾100萬元至1000萬元部分：每萬元加徵90元 (0.9%)
    // 逾1000萬元至1億元部分：每萬元加徵80元 (0.8%)
    // 逾1億元部分：每萬元加徵70元 (0.7%)
    let remaining = claimAmount;
    let fee = 0;

    // 0 - 100,000
    fee += 1000;
    remaining -= 100000;

    if (remaining > 0) {
      const tier1 = Math.min(remaining, 900000); // 10萬~100萬
      fee += Math.ceil(tier1 / 10000) * 100;
      remaining -= tier1;
    }

    if (remaining > 0) {
      const tier2 = Math.min(remaining, 9000000); // 100萬~1000萬
      fee += Math.ceil(tier2 / 10000) * 90;
      remaining -= tier2;
    }

    if (remaining > 0) {
      const tier3 = Math.min(remaining, 90000000); // 1000萬~1億
      fee += Math.ceil(tier3 / 10000) * 80;
      remaining -= tier3;
    }

    if (remaining > 0) {
      // 逾1億元
      fee += Math.ceil(remaining / 10000) * 70;
    }

    firstInstanceFee = fee;
  }

  if (instance === 'second_third') {
    const fee = Math.round(firstInstanceFee * 1.5);
    return {
      fee,
      basisRule: '民事訴訟法第77條之16：向第二審或第三審法院起訴或上訴，加徵裁判費十分之五（即一審之1.5倍）'
    };
  }

  return {
    fee: firstInstanceFee,
    basisRule: '民事訴訟法第77條之13：因財產權而起訴之分級累進費率'
  };
}

/**
 * 格式化金額千分位
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
}
