import { questions as sharedQuestions } from "../9-la-bai/questions";

type Question = readonly [string, string, string?];
export type Topic = { id: string; name: string; icon: string; description: string; questions: readonly Question[] };
export const topics: Topic[] = [
  { id: "tinh-toan", name: "Tính toán", icon: "🧮", description: "Nhẩm nhanh, đừng run", questions: [
    ["25 × 4 bằng bao nhiêu?", "100"], ["15% của 200 là bao nhiêu?", "30"],
    ["Hóa đơn 360.000đ chia đều cho 3 người, mỗi người bao nhiêu?", "120.000đ"],
    ["Một áo giá 200.000đ giảm 25%, còn bao nhiêu?", "150.000đ"], ["7 × 8 bằng bao nhiêu?", "56"],
    ["Một giờ rưỡi là bao nhiêu phút?", "90 phút"], ["3² + 4² bằng bao nhiêu?", "25"],
    ["Dãy 2, 4, 8, 16: số tiếp theo là gì?", "32"], ["Mua 3 món, mỗi món 35.000đ. Tổng tiền?", "105.000đ"],
    ["Một nửa của một nửa của 100 là bao nhiêu?", "25"], ["12 × 12 bằng bao nhiêu?", "144"],
    ["Có 500.000đ, tiêu 185.000đ và 115.000đ. Còn bao nhiêu?", "200.000đ"],
  ] },
  { id: "showbiz", name: "Showbiz", icon: "🎤", description: "Hóng nhiều có lợi thế", questions: sharedQuestions.filter(q => q[0] === "Showbiz").map(q => [q[1], q[2]] as const) },
  { id: "lam-dep", name: "Làm đẹp", icon: "💄", description: "Hội mê son lên tiếng", questions: [
    ["Mascara thường dùng cho bộ phận nào?", "Lông mi"], ["Blush là tên tiếng Anh của món trang điểm nào?", "Phấn má hồng"],
    ["Eyeliner dùng để kẻ gì?", "Kẻ mắt"], ["Lip balm là sản phẩm gì?", "Son dưỡng môi"],
    ["Foundation trong trang điểm là gì?", "Kem nền"], ["Concealer dùng để làm gì trong trang điểm?", "Che khuyết điểm"],
    ["Nail art là nghệ thuật làm đẹp cho bộ phận nào?", "Móng tay / móng chân"],
    ["Dụng cụ bấm mi dùng để tạo dáng gì cho lông mi?", "Làm cong lông mi"],
    ["Ombre là kiểu phối một màu đồng nhất hay chuyển sắc?", "Chuyển sắc"],
    ["Son matte có bề mặt lì hay bóng?", "Lì"], ["Highlighter trong trang điểm dùng để tạo hiệu ứng gì?", "Bắt sáng"],
    ["Dầu gội khô trong tiếng Anh gọi là gì?", "Dry shampoo"],
  ] },
  { id: "bong-da", name: "Bóng đá", icon: "⚽", description: "Fan cứng hay fan phong trào?", questions: [
    ["Đội tuyển nào vô địch World Cup nam 2022?", "Argentina"], ["World Cup nam 2022 tổ chức ở quốc gia nào?", "Qatar"],
    ["Đội tuyển nào vô địch World Cup nam 2018?", "Pháp"], ["Đội tuyển nào vô địch World Cup nam 2014?", "Đức"],
    ["Lionel Messi thi đấu cho đội tuyển quốc gia nào?", "Argentina"], ["Cristiano Ronaldo thi đấu cho đội tuyển quốc gia nào?", "Bồ Đào Nha"],
    ["Neymar thi đấu cho đội tuyển quốc gia nào?", "Brazil"], ["Kylian Mbappé thi đấu cho đội tuyển quốc gia nào?", "Pháp"],
    ["Câu lạc bộ Real Madrid thuộc quốc gia nào?", "Tây Ban Nha"], ["Câu lạc bộ Manchester United thuộc quốc gia nào?", "Anh"],
    ["Ai ghi bàn duy nhất ở chung kết World Cup nam 2014?", "Mario Götze (Mario Goetze)"],
    ["Đội tuyển nào thua Argentina trong chung kết World Cup nam 2022?", "Pháp"],
  ] },
  { id: "da-lat", name: "Đà Lạt", icon: "🌲", description: "Đi chơi có để ý không?", questions: [
    ["Hồ nổi tiếng ngay trung tâm Đà Lạt tên gì?", "Hồ Xuân Hương"],
    ["Quảng trường nổi tiếng ở Đà Lạt có nụ atisô khổng lồ tên gì?", "Quảng trường Lâm Viên"],
    ["Đà Lạt thường được gọi là thành phố ngàn gì?", "Ngàn hoa"],
    ["Loại quả đỏ thường được hái tại vườn ở Đà Lạt là gì?", "Dâu tây"],
    ["Chợ đêm Đà Lạt còn có tên quen thuộc là chợ gì?", "Chợ Âm Phủ"],
    ["Núi nổi tiếng gắn với chuyện tình K’lang và H’biang tên gì?", "Lang Biang"],
    ["Công trình tôn giáo màu hồng nổi tiếng mang tên Domaine de Marie là nhà thờ gì?", "Nhà thờ Mai Anh / Domaine de Marie"],
    ["Món bánh nóng Đà Lạt được đổ trong khuôn nhỏ, thường ăn với trứng và nước chấm, tên gì?", "Bánh căn"],
    ["Loài hoa vàng thường phủ các triền đồi Đà Lạt vào cuối năm tên gì?", "Dã quỳ"],
    ["Hồ nào ở Đà Lạt gắn với Thiền viện Trúc Lâm?", "Hồ Tuyền Lâm"],
    ["Ga xe lửa cổ nổi tiếng của Đà Lạt thường được gọi là ga gì?", "Ga Đà Lạt"],
    ["Món uống nóng từ đậu thường bán ở chợ đêm Đà Lạt là gì?", "Sữa đậu nành"],
  ] },
  { id: "ten-bai-hat", name: "Tên bài hát", icon: "🎵", description: "Nhạc Việt, đoán từ gợi ý", questions: [
    ["Hit của Hoàng Thùy Linh có tên tiếng Anh ghép từ See và một từ tiếng Việt chỉ tình cảm?", "See Tình"],
    ["Ca khúc của Bích Phương có tên là một thứ bùa liên quan đến tình cảm?", "Bùa yêu"],
    ["Ca khúc Đen kết hợp JustaTee, tên gồm ba từ nói về hành động trở lại mái ấm?", "Đi về nhà"],
    ["Ca khúc của Đen kết hợp Nguyên Thảo, tên như lời dặn mang thu nhập về cho mẹ?", "Mang tiền về cho mẹ"],
    ["Hit của Đức Phúc có tên mang nghĩa tình cảm vượt trên cả yêu?", "Hơn cả yêu"],
    ["Ca khúc của Tùng Dương, sáng tác Đông Thiên Đức, có tên là một chuyến đi quanh đất nước?", "Một vòng Việt Nam"],
    ["Ca khúc của Sơn Tùng M-TP có tên bắt đầu bằng Nơi này và kết thúc bằng anh?", "Nơi này có anh"],
    ["Ca khúc của nhóm 365 có tên gồm các tiếng Bống và bang lặp lại?", "Bống bống bang bang"],
    ["Ca khúc Hoàng Thùy Linh kết hợp Đen có tên là một hành động xem vận may?", "Gieo quẻ"],
    ["Ca khúc Hoàng Thùy Linh có tên nhắc đến nhân vật Mị và việc kể chuyện?", "Để Mị nói cho mà nghe"],
    ["Ca khúc Hòa Minzy năm 2025 có tên chơi chữ giữa Bắc Ninh và từ bling?", "Bắc Bling"],
    ["Hit của Sơn Tùng M-TP có tên chỉ em thuộc về ngày trước hôm nay?", "Em của ngày hôm qua"],
  ] },
  { id: "do-meo", name: "Đố mẹo", icon: "🧠", description: "Nghe hết câu rồi hãy gáy", questions: sharedQuestions.filter(q => q[0] === "Đố mẹo").map(q => [q[1], q[2]] as const) },
  {"id":"drama-gan-day","name":"Drama gần đây","icon":"🍿","description":"Trend, meme & chuyện hot","questions":[["Câu nói viral “Hồi chiều trời mưa” trong clip gốc là của nghệ sĩ nào?","Trường Giang"],["Clip gốc “Hồi chiều trời mưa” của Trường Giang được quay năm nào?","2017"],["MV Bắc Bling gây sốt năm 2025 gắn với nữ ca sĩ nào?","Hòa Minzy"],["Tên Bắc Bling chơi chữ từ tên địa phương nào?","Bắc Ninh"],["Đồ chơi tai nhọn, răng nhọn tên Labubu được bán bởi thương hiệu nào?","Pop Mart"],["Nhân vật Labubu do họa sĩ nào sáng tạo?","Kasing Lung"],["Matcha trong trào lưu matcha latte là bột gì?","Bột trà xanh"],["Trend bóc blind box: trước khi mở hộp, bạn biết chắc mẫu bên trong không?","Không. Đó là hộp mù."],["Trên mạng, “flex” thường được hiểu là làm gì?","Khoe thành tích, tài sản hoặc điều mình tự hào."],["Video mukbang thường có người đang làm gì trước máy quay?","Ăn uống."],["Từ “phông bạt” trên mạng thường chỉ việc khoe thật hay làm màu quá sự thật?","Làm màu, tạo vẻ ngoài hào nhoáng quá sự thật."],["Khi dân mạng nói “hóng biến”, họ đang chờ gì?","Chờ xem chuyện mới / diễn biến tiếp theo."]]},
  {"id":"logo","name":"Logo thương hiệu","icon":"🏷️","description":"Nhìn hình, gọi đúng tên","questions":[["Logo này thuộc thương hiệu nào? · Hình 01","Nike","/images/games/logos/mark-01.svg"],["Logo này thuộc thương hiệu nào? · Hình 02","Apple","/images/games/logos/mark-02.svg"],["Logo này thuộc thương hiệu nào? · Hình 03","Adidas","/images/games/logos/mark-03.svg"],["Logo này thuộc thương hiệu nào? · Hình 04","Puma","/images/games/logos/mark-04.svg"],["Logo này thuộc thương hiệu nào? · Hình 05","Audi","/images/games/logos/mark-05.svg"],["Logo này thuộc thương hiệu nào? · Hình 06","Target","/images/games/logos/mark-06.svg"],["Logo này thuộc thương hiệu nào? · Hình 07","Shell","/images/games/logos/mark-07.svg"],["Logo này thuộc thương hiệu nào? · Hình 08","Spotify","/images/games/logos/mark-08.svg"],["Logo này thuộc thương hiệu nào? · Hình 09","YouTube","/images/games/logos/mark-09.svg"],["Logo này thuộc thương hiệu nào? · Hình 10","Mitsubishi","/images/games/logos/mark-10.svg"],["Logo này thuộc thương hiệu nào? · Hình 11","PlayStation","/images/games/logos/mark-11.svg"],["Logo này thuộc thương hiệu nào? · Hình 12","McDonald’s","/images/games/logos/mark-12.svg"]]},
  {"id":"an-uong","name":"Ăn uống","icon":"🍜","description":"Ăn giỏi có trả lời giỏi?","questions":[["Nguyên liệu chính làm đậu phụ là loại đậu nào?","Đậu nành (đậu tương)"],["Trân châu đen trong trà sữa thường làm từ loại bột nào?","Bột năng (tinh bột sắn)"],["Món sushi gắn với ẩm thực nước nào?","Nhật Bản"],["Kim chi gắn với ẩm thực nước nào?","Hàn Quốc"],["Bánh chưng truyền thống thường có hình gì?","Hình vuông"],["Bánh tét truyền thống thường có hình gì?","Hình trụ dài"],["Phở thường dùng sợi làm từ gạo hay khoai tây?","Gạo"],["Cà phê sữa đá Việt Nam thường pha với loại sữa ngọt nào?","Sữa đặc có đường"],["Popcorn là món gì trong tiếng Việt?","Bắp rang / bỏng ngô"],["Pizza gắn với ẩm thực nước nào?","Ý (Italy)"],["Trứng muối thường dùng phổ biến là trứng gà hay trứng vịt?","Trứng vịt"],["Guacamole làm chủ yếu từ loại quả nào?","Quả bơ"]]},
  {"id":"dong-vat","name":"Động vật","icon":"🦥","description":"Dễ như xem thế giới động vật","questions":[["Con vật nào có chiếc cổ dài nổi tiếng?","Hươu cao cổ"],["Gấu trúc thường ăn loại cây nào?","Tre / trúc"],["Bạch tuộc có bao nhiêu tay?","8"],["Con vật nào có vòi dài và đôi tai lớn?","Con voi"],["Dơi là chim hay động vật có vú?","Động vật có vú"],["Cá heo thở bằng phổi hay mang?","Phổi"],["Loài chim nào nổi tiếng sống ở Nam Cực, biết bơi nhưng không biết bay?","Chim cánh cụt"],["Nòng nọc lớn lên thường trở thành con gì?","Ếch / nhái / cóc"],["Loài vật nào thường được gọi là chúa sơn lâm?","Hổ (cọp)"],["Mèo trưởng thành thường có bao nhiêu chân?","4 chân"],["Con gì mang ngôi nhà xoắn trên lưng, di chuyển chậm?","Ốc sên"],["Cá mập là cá hay động vật có vú?","Cá"]]},
  {"id":"cong-nghe","name":"Công nghệ","icon":"📱","description":"Dùng mỗi ngày, biết hết chưa?","questions":[["Phím tắt Ctrl + C trên Windows thường dùng làm gì?","Sao chép (copy)"],["Phím tắt Ctrl + V trên Windows thường dùng làm gì?","Dán (paste)"],["Phím tắt Ctrl + Z trên Windows thường dùng làm gì?","Hoàn tác (undo)"],["Trong địa chỉ email, ký tự nằm giữa tên hộp thư và tên miền là gì?","@"],["Mã QR thường được quét bằng bộ phận nào của điện thoại?","Camera"],["Bluetooth thường dùng để kết nối thiết bị có dây hay không dây?","Không dây"],["Chế độ máy bay thường có biểu tượng phương tiện gì?","Máy bay"],["PDF là định dạng tài liệu hay loại pin điện thoại?","Định dạng tài liệu"],["Bộ phận nào của máy tính thường được gọi là bộ não, viết tắt CPU?","Bộ xử lý trung tâm"],["USB thường dùng để kết nối thiết bị và truyền gì giữa các thiết bị?","Dữ liệu (và có thể cấp điện)"],["Một gigabyte viết tắt bằng hai chữ cái nào?","GB"],["Ứng dụng bản đồ thường dùng GPS để xác định điều gì?","Vị trí"]]},
];

export function drawRound(topic: Topic, seen: readonly string[] = []): Question[] {
  const fresh = topic.questions.filter(question => !seen.includes(question[0]));
  const pool = [...fresh, ...topic.questions.filter(question => seen.includes(question[0]))];
  // Prefer unseen questions; shuffle the two groups independently before filling five slots.
  function shuffle(items: Question[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  return [...shuffle(pool.slice(0, fresh.length)), ...shuffle(pool.slice(fresh.length))].slice(0, 5);
}
