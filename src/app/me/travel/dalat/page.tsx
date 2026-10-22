import { ArrowDown, ArrowLeft, ArrowUpRight, Check, Cloud, Compass, Heart, House, MapPin, Navigation, Sparkles, Trees, Wine } from "lucide-react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { PlaceLink } from "./_components/place-link";
import { Timeline } from "./_components/timeline";
import { allPlaces, days, home, mapHref, partyPlaces } from "./_components/trip-data";
import styles from "./trip.module.css";

const tripFont = localFont({
  src: [
    { path: "../../../../assets/fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-trip",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Đà Lạt | Chuyến đi của tụi mình",
  description: "Lịch trình Đà Lạt 3 ngày 2 đêm của tụi mình. Cà phê, săn mây, những buổi tối cùng nhau và vị trí từng điểm đến trên Google Maps.",
  robots: { index: false, follow: false },
};

const DalatPage = () => (
  <div className={`${styles.trip} ${tripFont.variable} dalat-page`} lang="vi">
    <header className="dalat-header">
      <Link href="/" className="dalat-brand" aria-label="Về trang chủ"><Trees size={25} strokeWidth={1.5} /><span>little trips<span>by Hậu & friends</span></span></Link>
      <nav aria-label="Điều hướng chuyến đi"><a href="#lich-trinh">Lịch trình</a><a href="#nha-va-tiec">Nhà & tiệc</a><a href="#dia-diem">Địa điểm</a></nav>
      <ThemeToggle className="dalat-theme-toggle" />
    </header>

    <section className="dalat-hero" aria-labelledby="trip-title">
      <div className="dalat-hero-content">
        <p className="dalat-hero-kicker"><Sparkles size={14} /> MỘT CHUYẾN ĐI CỦA TỤI MÌNH</p>
        <h1 id="trip-title">Đà Lạt,<br /><em>đi để mơ.</em><span className="dalat-title-spark" aria-hidden="true">✳</span></h1>
        <p className="dalat-hero-description">Để phố lại sau lưng, hẹn nhau giữa tầng mây.<br />Ba ngày thật chậm. Cả một trời kỷ niệm.</p>
        <div className="dalat-hero-actions">
          <Button asChild size="lg" className="dalat-hero-button"><a href="#lich-trinh">Khám phá lịch trình <ArrowDown size={17} /></a></Button>
          <span>03 NGÀY / 02 ĐÊM</span>
        </div>
      </div>
      <div className="dalat-hero-visual">
        <div className="dalat-photo-frame">
          <Image src="/images/travel/dalat/highlands.jpg" alt="Nắng chiều trên mặt hồ, bao quanh là những ngọn đồi và rừng thông Đà Lạt" fill priority sizes="(max-width: 760px) 95vw, 50vw" className="dalat-hero-image" />
          <div className="dalat-hero-shade" />
          <span className="dalat-photo-caption"><MapPin size={13} /> ĐÀ LẠT, LÂM ĐỒNG<span>11°56′ N / 108°26′ E</span></span>
        </div>
        <span className="dalat-floating-note"><Cloud size={28} strokeWidth={1.4} /><span>Hẹn nhau<br /><strong>dưới trời nhiều mây.</strong></span><Sparkles size={16} /></span>
        <span className="dalat-photo-orbit" aria-hidden="true" />
        <span className="dalat-photo-star" aria-hidden="true">✳</span>
      </div>
    </section>

    <div className="dalat-content">
      <div className="dalat-trip-strip">
        <div><span className="dalat-strip-icon"><Compass size={20} /></span><span><strong>3 ngày, 2 đêm</strong><small>Ăn ngon, đi chơi, ở cùng nhau</small></span></div>
        <div><span className="dalat-strip-icon"><Cloud size={20} /></span><span><strong>Một hẹn với mây</strong><small>Bình minh ngày 3, Măng Lin</small></span></div>
        <a href={mapHref(home)} target="_blank" rel="noopener noreferrer"><span className="dalat-strip-icon"><House size={20} /></span><span><strong>Home ở khu Dinh 1</strong><small>12/2 Trần Quang Diệu</small></span><ArrowUpRight size={17} /></a>
      </div>

      <section id="lich-trinh" className="dalat-itinerary">
        <div className="dalat-section-heading"><div><p className="dalat-eyebrow">THE ITINERARY</p><h2>Ba ngày ở <em>phố núi.</em></h2></div><p>Lịch có thể thong thả một chút. <br />Bấm tên địa điểm để mở Google Maps.</p></div>
        <div className="dalat-planner-layout">
          <Tabs defaultValue="ngay-1" className="dalat-tabs">
            <TabsList className="dalat-day-tabs" aria-label="Chọn ngày trong lịch trình">
              {days.map((day, index) => <TabsTrigger value={day.id} key={day.id} className="dalat-day-tab"><span>NGÀY {index + 1}</span><strong>{day.short}</strong></TabsTrigger>)}
            </TabsList>
            {days.map((day) => <TabsContent value={day.id} key={day.id} className="dalat-tab-content"><Timeline day={day} /></TabsContent>)}
          </Tabs>
          <aside className="dalat-sidebar">
            <div className="dalat-home-note"><House size={24} strokeWidth={1.4} /><p className="dalat-eyebrow">CĂN CỨ CỦA TỤI MÌNH</p><h3>Một căn nhà,<br /><em>nhiều tiếng cười.</em></h3><p>{home.address}</p><a href={mapHref(home)} target="_blank" rel="noopener noreferrer">Chỉ đường về home <ArrowUpRight size={16} /></a><div className="dalat-home-times"><span>CHECK-IN<strong>Ngày 1 · 13:00</strong></span><span>CHECKOUT<strong>Ngày 3 · 10:30</strong></span></div></div>
            <div className="dalat-note"><Sparkles size={18} /><p><strong>Một chút linh hoạt</strong>Quán acoustic và trò chơi chiều ngày 2 để cả nhóm chọn. Các mục “gợi ý” chưa phải lịch đã chốt.</p></div>
            <div className="dalat-mini-checklist"><p className="dalat-eyebrow">NHỚ MANG THEO</p>{["Áo khoác & áo mưa gọn", "Giày dễ đi, sạc dự phòng", "Giấy tờ, đồ dùng cá nhân", "Uno & một chiếc tâm hồn vui"].map((item) => <label key={item}><input type="checkbox" /><span className="dalat-checkbox"><Check size={12} /></span>{item}</label>)}</div>
          </aside>
        </div>
      </section>

      <section id="nha-va-tiec" className="dalat-party-section">
        <div className="dalat-party-intro"><span className="dalat-party-icon"><Wine size={28} strokeWidth={1.4} /></span><p className="dalat-eyebrow">A NIGHT TO REMEMBER</p><h2>Một tối ở nhà,<br /><em>vui cùng nhau.</em></h2><p>Ngày 2 · từ 18:00 tại homestay.<br />Đồ ăn ngon, nhạc mình thích và đủ mặt tụi mình.</p><a href={mapHref(home)} target="_blank" rel="noopener noreferrer">Về home bày tiệc <ArrowUpRight size={17} /></a></div>
        <div className="dalat-party-plan"><div className="dalat-takeaway"><h3>Đồ nhậu mang về <span>Gợi ý để chọn</span></h3>{partyPlaces.map((place) => <div key={place.id}><PlaceLink place={place} compact /><p>{place.note}</p></div>)}</div></div>
      </section>

      <section id="dia-diem" className="dalat-map-section"><div className="dalat-section-heading"><div><p className="dalat-eyebrow">KEEP THESE CLOSE</p><h2>Mọi điểm đến,<br className="dalat-mobile-break" /> <em>một chạm là tới.</em></h2></div><span className="dalat-map-caption"><Navigation size={17} /> Mở bằng Google Maps</span></div><p className="dalat-places-note">Gồm cả những phương án đang cân nhắc. Với điểm chưa có địa chỉ chi tiết, Maps sẽ mở tìm kiếm theo tên.</p><div className="dalat-all-places">{allPlaces.map((place) => <PlaceLink key={place.id} place={place} />)}</div></section>

      <footer className="dalat-footer"><div><Trees size={24} strokeWidth={1.3} /><span>Mang về những câu chuyện, <Heart size={13} /> để dành những lần sau.</span></div><p>Ngày đi cụ thể & giờ xe về sẽ cập nhật sau.</p><div className="dalat-footer-bottom"><Link href="/"><ArrowLeft size={14} /> Về portfolio</Link><a href="https://vinpearl.com/vi/ho-tuyen-lam-da-lat" target="_blank" rel="noopener noreferrer">Ảnh phong cảnh: Vinpearl <ArrowUpRight size={12} /></a></div></footer>
    </div>
    <nav className="dalat-mobile-nav" aria-label="Truy cập nhanh"><a href="#lich-trinh"><Compass size={19} /><span>Lịch trình</span></a><a href={mapHref(home)} target="_blank" rel="noopener noreferrer"><House size={19} /><span>Về home</span></a><a href="#nha-va-tiec"><Wine size={19} /><span>Bữa tiệc</span></a><a href="#dia-diem"><MapPin size={19} /><span>Địa điểm</span></a></nav>
  </div>
);

export default DalatPage;
