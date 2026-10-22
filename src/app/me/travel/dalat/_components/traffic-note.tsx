import { CornerDownRight, RotateCw, Signpost, TriangleAlert } from "lucide-react";

const roadNotes = [
  { title: "Hoàng Văn Thụ → Trần Phú", description: "Rẽ phải vào Trần Lê rồi đi vòng quanh hồ.", Icon: CornerDownRight },
  { title: "Khởi Nghĩa Bắc Sơn → Trần Hưng Đạo", description: "Xuống dốc rẽ phải vào Trần Hưng Đạo; chú ý không đè vạch xương cá.", Icon: CornerDownRight },
  { title: "Khu Hòa Bình", description: "Đường một chiều: ôm vòng quanh Nhà hát Hòa Bình như một vòng xuyến lớn.", Icon: RotateCw },
  { title: "Phan Đình Phùng ↔ đường 3/2", description: "Không rẽ trái từ Phan Đình Phùng lên 3/2; không rẽ phải từ 3/2 xuống Phan Đình Phùng.", Icon: Signpost },
];

export const TrafficNote = () => (
  <aside id="luu-y-duong-di" className="dalat-traffic-note" aria-labelledby="traffic-note-title">
    <div className="dalat-traffic-heading">
      <span className="dalat-traffic-icon"><TriangleAlert size={22} aria-hidden="true" /></span>
      <div><p className="dalat-eyebrow">LƯU Ý GIAO THÔNG</p><h2 id="traffic-note-title">Những đoạn đường dễ đi nhầm</h2></div>
    </div>
    <p className="dalat-traffic-source">Ghi chú nhóm chia sẻ, chưa xác minh cập nhật. Đối chiếu biển báo và vạch đường thực tế khi đi.</p>
    <ol className="dalat-road-list">
      {roadNotes.map(({ title, description, Icon }, index) => (
        <li key={title}>
          <span className="dalat-road-number">0{index + 1}</span>
          <div><h3><Icon size={14} aria-hidden="true" />{title}</h3><p>{description}</p></div>
        </li>
      ))}
    </ol>
  </aside>
);
