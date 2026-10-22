import { Check } from "lucide-react";

const packingGroups = [
  { title: "Giấy tờ & thanh toán", items: ["CCCD / giấy tờ tùy thân", "Bằng lái xe", "Tiền mặt lẻ & thẻ", "Vé xe, thông tin đặt phòng"] },
  { title: "Quần áo & đồ cá nhân", items: ["Áo khoác ấm, khăn choàng", "Đồ mặc cho 3 ngày", "Đồ ngủ, đồ lót & tất", "Giày thể thao, dép đi home", "Bàn chải, kem đánh răng", "Đồ skincare, khăn cá nhân", "Thuốc cá nhân, băng cá nhân", "Kem chống nắng, son dưỡng"] },
  { title: "Công nghệ", items: ["Điện thoại & củ sạc", "Sạc dự phòng, cáp sạc", "Máy ảnh & thẻ nhớ nếu có", "Túi chống nước điện thoại"] },
  { title: "Đi chơi & săn mây", items: ["Áo mưa gọn, túi chống ướt", "Nón, kính râm", "Bình nước cá nhân", "Xịt chống muỗi", "Đèn pin nhỏ để săn mây", "Đồ khô nhanh & đồ thay nếu SUP", "Túi đựng quần áo bẩn", "Uno / bộ bài cho buổi tiệc"] },
];

export const PackingList = () => (
  <div className="dalat-mini-checklist">
    <p className="dalat-eyebrow">NHỚ MANG THEO</p>
    {packingGroups.map((group) => (
      <div className="dalat-packing-group" key={group.title}>
        <h4>{group.title}</h4>
        <div className="dalat-packing-items">
          {group.items.map((item) => <label key={item}><input type="checkbox" /><span className="dalat-checkbox"><Check size={12} aria-hidden="true" /></span>{item}</label>)}
        </div>
      </div>
    ))}
  </div>
);
