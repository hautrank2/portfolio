export type Place = {
  id: string;
  name: string;
  address: string;
  query?: string;
};

export type TripEvent = {
  time: string;
  title: string;
  note: string;
  kind: "food" | "coffee" | "explore" | "home" | "party" | "cloud" | "walk" | "gift";
  places: Place[];
  tag?: string;
  alternatives?: boolean;
};

export type TripDay = {
  id: string;
  number: string;
  short: string;
  title: string;
  description: string;
  events: TripEvent[];
};

export const home: Place = {
  id: "home",
  name: "Homestay của tụi mình",
  address: "12/2 Trần Quang Diệu, khu tập thể Dinh 1, Xuân Hương – Đà Lạt",
  query: "LylyHouse Hotel-Dalat 12/2 Trần Quang Diệu Đà Lạt",
};

export const games = [
  {
    id: "pine-kart",
    name: "Pine Kart · Datanla",
    address: "Datanla Adventures, đèo Prenn, Đà Lạt",
    query: "Pine Kart Datanla Adventures Đà Lạt",
    label: "Thích vận động",
    note: "Lái xe địa hình giữa rừng thông. Trò ngắn, dễ ghép sau bảo tàng; tính thêm thời gian hướng dẫn và chờ.",
  },
  {
    id: "painting",
    name: "KG.art · Workshop vẽ tranh",
    address: "Khu Đào Duy Từ, Đà Lạt",
    label: "Nhẹ nhàng cùng nhau",
    note: "Vẽ một bức tranh mang về làm kỷ niệm. Đặt trước khung giờ và hỏi thời lượng phù hợp với nhóm.",
  },
  {
    id: "zipline",
    name: "Zipline 1.500 m · Datanla",
    address: "Khu du lịch Datanla, đèo Prenn, Đà Lạt",
    label: "Thêm chút mạo hiểm",
    note: "Đu dây xuyên rừng. Cần tới trước giờ ngừng nhận khách 15:30 và kiểm tra điều kiện tham gia.",
  },
];

export const partyPlaces: (Place & { note: string })[] = [
  {
    id: "ko-lang",
    name: "Buôn Kơ Lang",
    address: "16 Hùng Vương, Đà Lạt",
    note: "Hỏi bò một nắng, gỏi mít, mẹt gà và khả năng đóng hộp mang về. Gọi trước: 0901 308 000.",
  },
  {
    id: "tuu-lau",
    name: "Gà Nướng Tửu Lầu",
    address: "125 Phù Đổng Thiên Vương, Đà Lạt",
    note: "Gà nướng chặt sẵn, nước chấm để riêng. Có trang đặt giao món; kiểm tra đơn tới home trước khi chọn.",
  },
  {
    id: "chicken-feet",
    name: "Chân gà sốt Thái Thảo Nguyên",
    address: "36 La Sơn Phu Tử, Đà Lạt",
    note: "Món nhắm chua cay cho cả nhóm. Có trang đặt giao món; hẹn nhận gần giờ bắt đầu tiệc.",
  },
];

export const days: TripDay[] = [
  {
    id: "ngay-1",
    number: "01",
    short: "Chạm phố núi",
    title: "Chào Đà Lạt, chào những ngày thảnh thơi.",
    description: "Ăn một bữa sáng nóng, uống cà phê giữa đồi, rồi khép ngày bằng một đêm nhạc.",
    events: [
      {
        time: "07:30 – 08:30", title: "Bữa sáng đầu tiên", kind: "food", tag: "Chọn 1 quán", alternatives: true,
        note: "Dự kiến tới Đà Lạt lúc 07:30. Ăn sáng, nhận xe và gửi hành lý nếu home chưa cho check-in sớm.",
        places: [
          { id: "kieu-quan", name: "Bánh cuốn Kiều Quán", address: "242A Hai Bà Trưng, Đà Lạt" },
          { id: "banh-can", name: "Bánh căn Chị 7", address: "1C Hoàng Hoa Thám, Đà Lạt" },
        ],
      },
      {
        time: "08:45 – 11:00", title: "Một sáng ở vùng ngoại ô", kind: "coffee",
        note: "Ngồi cà phê, ngắm đồi và chụp những tấm hình đầu tiên. Khung này dành cho ngắm cảnh; buổi săn mây chính để ngày 3.",
        places: [{ id: "vung-ngoai-o", name: "Tiệm cà phê Vùng Ngoại Ô", address: "Đường Đình Đa Quý, Xuân Trường – Đà Lạt" }],
      },
      {
        time: "11:15 – 12:30", title: "Ăn trưa cho ấm bụng", kind: "food", tag: "Chọn 1 quán", alternatives: true,
        note: "Chọn một bữa cơm gia đình. Giờ đến điều chỉnh theo thời gian di chuyển từ quán cà phê.",
        places: [
          { id: "com-nieu", name: "Cơm niêu 3 Mẹ Con", address: "Đà Lạt", query: "Cơm niêu 3 Mẹ Con Đà Lạt" },
          { id: "com-hoi-do", name: "Tiệm Cơm Hồi Đó", address: "Đường Lý Nam Đế, Đà Lạt" },
        ],
      },
      { time: "13:00 – 15:00", title: "Về home, nghỉ một chút", kind: "home", note: "Check-in, cất hành lý, tắm và nghỉ sau chuyến xe. Sạc điện thoại để chiều còn chụp hình nhé.", places: [home] },
      {
        time: "15:30 – 16:30", title: "Dạo quanh nhà ga cũ", kind: "explore", tag: "Gợi ý buổi chiều",
        note: "Tham quan kiến trúc nhà ga cũ, đi dạo và chụp những tấm hình cùng cả nhóm.",
        places: [{ id: "station", name: "Ga Đà Lạt", address: "1 Quang Trung, Đà Lạt" }],
      },
      {
        time: "18:00 – 20:00", title: "Bữa tối cùng cả nhóm", kind: "food", tag: "Chọn 1 quán", alternatives: true,
        note: "Ăn tối sớm hơn một chút để kịp tới quán acoustic. Đặt bàn trước nếu đi nhóm đông.",
        places: [
          { id: "tram-dung", name: "Tiệm nướng Trạm Dừng Chill", address: "111 Huỳnh Tấn Phát, Đà Lạt" },
          { id: "vuon-lau", name: "Vườn Lẩu Đà Lạt", address: "4A Hồ Tùng Mậu, Đà Lạt" },
        ],
      },
      {
        time: "20:45 – 22:00", title: "Ngồi lại nghe một đêm nhạc", kind: "coffee", tag: "Chưa chốt quán", alternatives: true,
        note: "Cà phê acoustic theo ý cả nhóm. Kiểm tra lịch diễn theo ngày đi; nếu nhạc bắt đầu lúc 20:00 thì tới sớm hơn.",
        places: [
          { id: "sense", name: "Sense Coffee Acoustic", address: "Đà Lạt", query: "Sense Coffee Acoustic Đà Lạt" },
          { id: "memory", name: "Memory Acoustic", address: "Khu Hùng Vương, Đà Lạt", query: "Memory Acoustic Hùng Vương Đà Lạt" },
        ],
      },
    ],
  },
  {
    id: "ngay-2", number: "02", short: "Đi chơi & sinh nhật",
    title: "Đi chơi cùng nhau. Tối về mở tiệc.",
    description: "Từ ngôi làng giữa rừng thông đến một buổi sinh nhật ở căn nhà nhỏ của tụi mình.",
    events: [
      { time: "05:00 – 06:00", title: "Hẹn nhau một vòng hồ", kind: "walk", tag: "Ai dậy được thì đi", note: "Kim Thảo và Ly Nguyễn chạy bộ quanh hồ. Những ai cần ngủ thêm cứ thong thả nhé.", places: [{ id: "lake", name: "Hồ Xuân Hương", address: "Trung tâm Đà Lạt" }] },
      { time: "06:30 – 07:30", title: "Ăn sáng rồi lên đường", kind: "food", note: "Gợi ý phở atisô; để dành bánh mì xíu mại cho sáng ngày 3.", places: [{ id: "pho", name: "Phở Atisô Đà Lạt", address: "20 Phạm Hồng Thái, Đà Lạt" }] },
      { time: "08:00 – 12:00", title: "Một buổi sáng giữa rừng", kind: "explore", note: "Dạo Làng Cù Lần, chụp ảnh và ăn trưa tại đây nếu cả nhóm muốn. Dành thêm thời gian quay về thành phố.", places: [{ id: "village", name: "Làng Cù Lần", address: "Khu Suối Cạn, Lang Biang – Đà Lạt", query: "Khu du lịch Làng Cù Lần Lâm Đồng" }] },
      { time: "13:30 – 14:45", title: "Ghé thăm Đà Lạt ngày xưa", kind: "explore", note: "Dành 60–90 phút xem lịch sử Đà Lạt, hiện vật khảo cổ và văn hóa các dân tộc bản địa.", places: [{ id: "museum", name: "Bảo tàng tỉnh Lâm Đồng", address: "4 Hùng Vương, Xuân Hương – Đà Lạt" }] },
      { time: "15:00 – 16:30", title: "Chọn một trò chơi cho cả nhóm", kind: "explore", tag: "Cả nhóm cùng chọn", alternatives: true, note: "Pine Kart, workshop vẽ tranh hoặc zipline. Chỉ chọn một hoạt động; giờ chơi điều chỉnh theo địa điểm và lịch đặt trước.", places: games },
      { time: "16:30 – 18:00", title: "Mua đồ ngon, về home bày tiệc", kind: "food", note: "Đồ nhậu có thể đặt làm sẵn; mua thêm nước uống, đá và trái cây. Hẹn nhận đồ trên đường về hoặc giao tới home.", places: [home] },
      { time: "18:00 – tối", title: "Happy birthday, bạn của tụi mình!", kind: "party", note: "Bày đồ ăn, mở nhạc, chụp một tấm hình chung. Rồi chơi Uno, đoán bài hát hay kể chuyện tới khi buồn ngủ. Kết thúc vừa sức để sáng mai còn săn mây.", places: [home] },
    ],
  },
  {
    id: "ngay-3", number: "03", short: "Hẹn với mây",
    title: "Dậy sớm một hôm, mang cả trời mây về.",
    description: "Săn mây, ăn sáng nóng, ghé mua chút quà rồi trở về home trước giờ trả phòng.",
    events: [
      { time: "04:00 – 07:00", title: "Hẹn bình minh ở Măng Lin", kind: "cloud", note: "Săn mây theo kế hoạch của nhóm. Xác nhận pin điểm hẹn hoặc tour từ tối hôm trước; Maps bên dưới tìm khu vực Măng Lin. Có mây hay không tùy thời tiết.", places: [{ id: "mang-lin", name: "Khu vực Măng Lin", address: "Măng Lin, Đà Lạt", query: "Măng Lin Đà Lạt" }] },
      { time: "07:30 – 08:15", title: "Bánh mì nóng sau buổi săn mây", kind: "food", note: "Ghé Bùi Thị Xuân trên tuyến về qua thành phố. Ăn sáng gọn để còn thời gian mua quà.", places: [{ id: "banh-mi", name: "Bánh mì xíu mại 79", address: "212 Bùi Thị Xuân, Đà Lạt" }] },
      { time: "08:15 – 09:00", title: "Mang một chút Đà Lạt về nhà", kind: "gift", note: "Trà atisô, cà phê, trái cây sấy hoặc mứt. Mua quà trên cùng đường với chỗ ăn sáng.", places: [{ id: "langfarm", name: "L’angfarm Bùi Thị Xuân", address: "51 Bùi Thị Xuân, Đà Lạt", query: "Langfarm 51 Bùi Thị Xuân Đà Lạt" }] },
      { time: "09:00 – 10:15", title: "Về home, thu dọn hành lý", kind: "home", note: "Tắm, kiểm tra đồ đạc, gom hành lý và chụp một tấm ảnh cả nhóm trước khi rời nhà.", places: [home] },
      { time: "10:30", title: "Checkout · Hẹn gặp lại Đà Lạt", kind: "home", tag: "Nhớ giờ trả phòng", note: "Trả phòng lúc 10:30. Lịch sau checkout sẽ bổ sung khi có giờ và điểm đón xe về.", places: [home] },
    ],
  },
];

export const mapHref = (place: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.query ?? `${place.name}, ${place.address}`)}`;

export const allPlaces = Array.from(
  new Map([home, ...days.flatMap((day) => day.events.flatMap((event) => event.places)), ...partyPlaces].map((place) => [place.id, place])).values(),
);
