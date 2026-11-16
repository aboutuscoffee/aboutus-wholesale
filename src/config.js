// 注文・お問い合わせの送り先（公開ページに表示されます）
// 卸専用の窓口（info は全スタッフが見るため分けている）
export const ORDER_EMAIL = 'wholesale.aboutuscoffee@gmail.com';
export const SHOP_NAME = 'ABOUT US COFFEE';

export const TAX_RATE = 0.08; // 飲食料品 軽減税率

// ヤマト運輸 B2クラウドの送り状CSV（管理 → 週ごとの集計）
// ご依頼主の住所・電話番号は B2 の取り込みに必須。未入力のままだと取り込み時にエラーになる
export const SHIPPER = {
  name: 'ABOUT US COFFEE',
  phone: '',      // 例: 075-000-0000
  postal: '',     // 例: 604-0000
  address: '',    // 例: 京都府京都市中京区〇〇町1-2
  apartment: '',  // 建物名など（任意）
};

export const YAMATO = {
  invoiceType: '0', // 送り状種類 0: 発払い
  coolType: '0',    // クール区分 0: 通常
  itemName: 'コーヒー豆',
};
