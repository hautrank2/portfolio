import { ArrowDown, ArrowLeft, ArrowUpRight, Check, Clock3, Dices, Fingerprint, Hand, Lightbulb, MessageCircle, NotebookPen, PencilLine, ScanFace, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "~/components/layouts/theme-toggle";

import { tripFont } from "../trip-font";
import tripStyles from "../trip.module.css";
import styles from "./games.module.css";

export const metadata: Metadata = {
  title: "Đà Lạt | Luật chơi tại home",
  description: "Luật 4 trò cho buổi tối ở homestay: Tôi chưa từng, Tìm kẻ giả mạo, Tôi là ai và Ai viết câu này?",
  robots: { index: false, follow: false },
};

const gameMenu = [
  { id: "toi-chua-tung", name: "Tôi chưa từng", subtitle: "Chuyện chưa kể", Icon: Hand },
  { id: "imposter", name: "Tìm kẻ giả mạo", subtitle: "Ai đang diễn?", Icon: Fingerprint },
  { id: "toi-la-ai", name: "Tôi là ai?", subtitle: "Hỏi hay, đoán nhanh", Icon: ScanFace },
  { id: "ai-viet-cau-nay", name: "Ai viết câu này?", subtitle: "Đoán nét tính cách", Icon: NotebookPen },
];

const neverPrompts = [
  "Tôi chưa từng thích một người trong nhóm bạn.",
  "Tôi chưa từng nói dối hai người còn lại.",
  "Tôi chưa từng stalk người yêu cũ.",
  "Tôi chưa từng đi hẹn hò bí mật.",
  "Tôi chưa từng giả vờ ngủ để không phải trả lời tin nhắn.",
];

const whoTopics = [
  ["Người nổi tiếng", "Sơn Tùng M-TP, Taylor Swift, Messi"],
  ["Anime", "Luffy, Naruto, Doraemon"],
  ["Phim ảnh", "Harry Potter, Iron Man, Elsa"],
  ["Động vật", "Capybara, mèo, gấu trúc"],
  ["Đồ vật", "Nồi cơm điện, bàn chải, dép"],
  ["Nhân vật hài hước", "Thần Tài, ông già Noel, Tôn Ngộ Không"],
];

const GamesPage = () => (
  <div className={`${tripStyles.trip} ${tripFont.variable} ${styles.gamesPage}`} lang="vi">
    <header className={`dalat-header ${styles.header}`}>
      <Link href="/me/travel/dalat" className={styles.back}><ArrowLeft size={17} /> Về chuyến đi</Link>
      <span className={styles.headerLabel}>little trips / playbook</span>
      <ThemeToggle className="dalat-theme-toggle" />
    </header>

    <div className={styles.container}>
      <section className={styles.hero} aria-labelledby="games-title">
        <div className={styles.heroCopy}>
          <p className="dalat-eyebrow"><Sparkles size={13} /> SAU MỘT NGÀY ĐI CHƠI</p>
          <h1 id="games-title">Tối nay,<br /><em>chơi gì đây?</em></h1>
          <p>Cất điện thoại xuống một chút.<br />Bốn trò nhỏ, đủ chuyện để cười cùng nhau.</p>
          <div className={styles.heroTags}><span><Users size={13} /> Dành cho nhóm 3 bạn</span><span><PencilLine size={13} /> Giấy, bút & chút sáng tạo</span></div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={`${styles.playCard} ${styles.playCardBack}`}><Fingerprint size={48} strokeWidth={1.2} /><span>AI ĐANG DIỄN?</span></div>
          <div className={`${styles.playCard} ${styles.playCardFront}`}><span className={styles.cardCorner}>04<Sparkles size={14} /></span><Dices size={65} strokeWidth={1.1} /><span>THÊM MỘT VÁN NỮA.</span><span className={styles.cardSpark}>✳</span></div>
        </div>
      </section>

      <nav className={styles.gameMenu} aria-label="Chọn luật trò chơi">
        {gameMenu.map(({ id, name, subtitle, Icon }, index) => <a href={`#${id}`} key={id}><span className={styles.menuIcon}><Icon size={21} strokeWidth={1.4} /></span><span><small>0{index + 1} / {subtitle}</small><strong>{name}</strong></span><ArrowDown size={15} /></a>)}
      </nav>

      <div className={styles.gameGrid}>
        <article id="toi-chua-tung" className={`${styles.game} ${styles.never}`} aria-labelledby="never-title">
          <div className={styles.gameTop}><span className={styles.gameIcon}><Hand size={25} strokeWidth={1.4} /></span><span className={styles.gameNumber}>01</span></div>
          <p className="dalat-eyebrow">NEVER HAVE I EVER</p><h2 id="never-title">Tôi chưa từng</h2>
          <p className={styles.gameIntro}>Một bàn tay giơ lên. Một câu chuyện được bật mí.</p>
          <div className={styles.meta}><span><Hand size={13} /> 5 ngón tay / người</span><span>Không cần dụng cụ</span></div>
          <h3 className={styles.subheading}>Cách chơi</h3>
          <ol className={styles.rules}>
            <li>Mỗi người giơ <strong>5 ngón tay</strong>.</li>
            <li>Lần lượt nói một câu bắt đầu bằng <strong>“Tôi chưa từng…”</strong>.</li>
            <li>Ai <strong>đã từng làm</strong> điều được nhắc đến thì gập một ngón tay.</li>
            <li>Sau mỗi câu, người gập ngón có thể kể câu chuyện phía sau. Rồi tới lượt người kế tiếp.</li>
          </ol>
          <div className={styles.exampleBox}><h3><MessageCircle size={15} /> 5 câu khởi động</h3><ul className={styles.promptList}>{neverPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></div>
          <p className={styles.gameTip}><Sparkles size={15} /><span>Điểm thú vị nằm ở những câu chuyện sau mỗi lần gập ngón tay.</span></p>
        </article>

        <article id="imposter" className={`${styles.game} ${styles.imposter}`} aria-labelledby="imposter-title">
          <div className={styles.gameTop}><span className={styles.gameIcon}><Fingerprint size={25} strokeWidth={1.4} /></span><span className={styles.gameNumber}>02</span></div>
          <p className="dalat-eyebrow">IMPOSTER GAME</p><h2 id="imposter-title">Tìm kẻ giả mạo</h2>
          <p className={styles.gameIntro}>Cùng một câu chuyện, có người đang ở một thế giới khác.</p>
          <div className={styles.meta}><span><Users size={13} /> 3 người</span><span>3 mẩu giấy từ khóa</span></div>
          <h3 className={styles.subheading}>Cách chơi</h3>
          <ol className={styles.rules}>
            <li>Chuẩn bị 3 mẩu giấy, gấp kín và trộn để mỗi người lấy một mẩu. <strong>Hai người nhận cùng từ khóa</strong>; người còn lại nhận một từ gần giống hoặc giấy trắng.</li>
            <li>Mỗi người mô tả từ khóa của mình bằng <strong>một câu</strong>, không nói thẳng từ khóa. Người nhận giấy trắng dựa vào lời của mọi người để ứng biến.</li>
            <li>Sau một vòng mô tả, cả ba <strong>bỏ phiếu cùng lúc</strong> để tìm Imposter.</li>
            <li>Lật từ khóa để xem ai là kẻ giả mạo. Nếu hòa phiếu, mô tả thêm một vòng rồi bỏ phiếu lại.</li>
          </ol>
          <div className={styles.exampleBox}><h3><Lightbulb size={15} /> Một ván ví dụ</h3><div className={styles.tableScroll}><table><caption className={styles.srOnly}>Ví dụ từ khóa và mô tả của ba người chơi Imposter</caption><thead><tr><th scope="col">Người</th><th scope="col">Từ khóa</th><th scope="col">Câu mô tả</th></tr></thead><tbody><tr><th scope="row">Player 1</th><td>Đà Lạt</td><td>Cao nguyên, bánh căn</td></tr><tr><th scope="row">Player 2</th><td>Đà Lạt</td><td>Thành phố, lạnh</td></tr><tr><th scope="row">Player 3</th><td><span className={styles.secretWord}>Sa Pa</span></td><td>Sương mù, miền Bắc</td></tr></tbody></table></div></div>
          <p className={styles.gameTip}><Fingerprint size={15} /><span>Mô tả đủ để đồng đội nhận ra, nhưng đừng quá lộ để Imposter bắt bài.</span></p>
        </article>

        <article id="toi-la-ai" className={`${styles.game} ${styles.who}`} aria-labelledby="who-title">
          <div className={styles.gameTop}><span className={styles.gameIcon}><ScanFace size={25} strokeWidth={1.4} /></span><span className={styles.gameNumber}>03</span></div>
          <p className="dalat-eyebrow">WHO AM I?</p><h2 id="who-title">Tôi là ai?</h2>
          <p className={styles.gameIntro}>Mọi người biết bạn là ai. Chỉ có bạn chưa biết.</p>
          <div className={styles.meta}><span><Clock3 size={13} /> 15–30 phút</span><span><PencilLine size={13} /> Giấy note, bút, điện thoại bấm giờ</span></div>
          <h3 className={styles.subheading}>Cách chơi</h3>
          <ol className={styles.rules}>
            <li>Mỗi người viết tên một <strong>nhân vật, người nổi tiếng hoặc đồ vật</strong> lên giấy note.</li>
            <li>Dán giấy lên trán người bên cạnh, không để họ nhìn thấy nội dung.</li>
            <li>Lần lượt đặt câu hỏi để đoán mình là ai.</li>
            <li>Hai người còn lại chỉ trả lời <strong>Yes / No / Maybe</strong>.</li>
            <li>Mỗi lượt hỏi tối đa <strong>5 câu</strong>. Chưa đoán được thì chuyển sang người tiếp theo.</li>
            <li>Ai đoán đúng với <strong>ít câu hỏi nhất</strong> sẽ thắng. Nhớ cộng cả số câu ở những lượt trước.</li>
          </ol>
          <div className={styles.exampleBox}><h3><Lightbulb size={15} /> Gợi ý chủ đề</h3><div className={styles.tableScroll}><table><caption className={styles.srOnly}>Chủ đề và ví dụ cho trò Tôi là ai</caption><thead><tr><th scope="col">Chủ đề</th><th scope="col">Ví dụ</th></tr></thead><tbody>{whoTopics.map(([topic, examples]) => <tr key={topic}><th scope="row">{topic}</th><td>{examples}</td></tr>)}</tbody></table></div></div>
          <p className={styles.gameTip}><MessageCircle size={15} /><span>Thử mở đầu: “Tôi có thật không?”, “Tôi là người?”, “Tôi xuất hiện trong phim?”</span></p>
        </article>

        <article id="ai-viet-cau-nay" className={`${styles.game} ${styles.writer}`} aria-labelledby="writer-title">
          <div className={styles.gameTop}><span className={styles.gameIcon}><NotebookPen size={25} strokeWidth={1.4} /></span><span className={styles.gameNumber}>04</span></div>
          <p className="dalat-eyebrow">GUESS THE WRITER</p><h2 id="writer-title">Ai viết câu này?</h2>
          <p className={styles.gameIntro}>Tưởng hiểu nhau lắm, cho đến khi đọc những câu trả lời.</p>
          <div className={styles.meta}><span><Users size={13} /> Cả 3 cùng viết</span><span><PencilLine size={13} /> Giấy & bút</span></div>
          <h3 className={styles.subheading}>Cách chơi</h3>
          <ol className={styles.rules}>
            <li>Một người đọc câu hỏi cho cả nhóm.</li>
            <li>Cả ba viết câu trả lời lên giấy, <strong>không ghi tên</strong>.</li>
            <li>Gấp giấy, trộn lại rồi đọc lần lượt từng câu.</li>
            <li>Mọi người đoán <strong>câu trả lời thuộc về ai</strong>, sau đó người viết bật mí.</li>
            <li>Đổi người đọc câu hỏi và tiếp tục vòng mới.</li>
          </ol>
          <div className={styles.exampleBox}><h3><MessageCircle size={15} /> Thử hỏi cả nhóm</h3><ul className={styles.promptList}><li>Kỷ niệm xấu hổ nhất khi đi du lịch?</li><li>Nếu chuyến Đà Lạt này là một bộ phim, tên phim sẽ là gì?</li><li>Một chuyện về mình mà hai người còn lại chưa biết?</li></ul></div>
          <p className={styles.gameTip}><Sparkles size={15} /><span>Với nhóm bạn thân, những câu trả lời cố tình đánh lừa nhau sẽ rất vui.</span></p>
        </article>
      </div>

      <footer className={styles.footer}><span><Check size={14} /> Đủ người, đủ vui. Thêm một ván nữa nhé?</span><Link href="/me/travel/dalat#nha-va-tiec">Về bữa tiệc của tụi mình <ArrowUpRight size={15} /></Link></footer>
    </div>
    <Link href="/me/travel/dalat#nha-va-tiec" className={styles.mobileBack}><ArrowLeft size={16} /> Về lịch trình Đà Lạt <Dices size={17} /></Link>
  </div>
);

export default GamesPage;
