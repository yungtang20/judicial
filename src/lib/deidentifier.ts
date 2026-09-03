export const scrubPersonalInfo = (text: string): string => {
  if (!text) return text;
  let res = text;
  // 遮蔽身分證字號
  res = res.replace(/[A-Z][1289]\d{8}/g, 'A1********');
  // 遮蔽手機號碼
  res = res.replace(/09\d{8}/g, '09********');
  res = res.replace(/09\d{2}-\d{3}-\d{3}/g, '09**-***-***');
  // 遮蔽市內電話
  res = res.replace(/0\d{1,2}-\d{3,4}-\d{4}/g, '0*-****-****');
  
  // 遮蔽地址 (縣市/鄉鎮市區段)
  res = res.replace(/([一-龥]{2}[縣市])(?:([一-龥]{1,3}[鄉鎮市區])([^，。\n]{1,20})|([^，。\n]{1,20}))/g, (match, p1, p2) => {
    if (p2) return `${p1}${p2}***`;
    return `${p1}***`;
  });
  
  // 姓名去識別化
  res = res.replace(/([一-龥]{1,3})(先生|女士|原告|被告|上訴人|被上訴人)/g, '◯◯◯$2');
  return res;
};
