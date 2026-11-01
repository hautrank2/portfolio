import { ArrowDown, ArrowRight, Braces, Code2, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { profileData, stackData } from "~/data/site";

const Hero = () => {
  return (
    <section id="banner" className="studio-hero relative overflow-hidden">
      <div aria-hidden="true" className="studio-aurora" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-8 lg:px-16 lg:pt-24">
        <div className="mb-12 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
          <span className="flex items-center gap-2"><span className="studio-status" /> Personal portfolio / {profileData.handle}</span>
          <span className="hidden sm:block">Design meets development</span>
        </div>
        <div className="grid items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <Reveal>
            <p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={14} className="text-primary" /> {profileData.location}</p>
            <h1 className="studio-title"><span className="studio-intro">Hello, I’m</span>Hau<span className="text-primary"> Tran.</span></h1>
            <p className="mt-6 flex items-center gap-3 text-lg font-medium sm:text-xl"><span className="h-px w-8 bg-primary" /> {profileData.role}<span className="studio-caret" aria-hidden="true">_</span></p>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{profileData.tagline}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="studio-button group rounded-full"><Link href="/showcase">Explore my work <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-border/70 bg-background/30"><Link href="/about">A little about me <span aria-hidden="true">↗</span></Link></Button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
              {stackData.map((stack, i) => <span key={stack.title} className="flex items-center gap-2"><span className="text-primary/60">0{i + 1}</span>{stack.title}</span>)}
            </div>
          </Reveal>
          <Reveal delay={160} className="studio-visual">
            <div className="studio-orbit studio-orbit-one" aria-hidden="true"><span /></div>
            <div className="studio-orbit studio-orbit-two" aria-hidden="true"><span /></div>
            <div className="studio-portrait">
              <div className="studio-window">
                <span /><span /><span />
                <span className="ml-auto font-mono text-[10px] tracking-wider text-muted-foreground">hello_world.tsx</span>
                <Code2 size={13} className="ml-2 text-primary" />
              </div>
              <div className="studio-photo">
                <Image
                  className="h-full w-full object-cover"
                  src={profileData.avatar}
                  alt={profileData.name}
                  width={420}
                  height={460}
                  priority
                />
                <div className="studio-photo-caption"><span className="studio-status" /> The human behind the pixels</div>
              </div>
              <div className="studio-code">
                <span className="text-primary">const</span> developer = <span className="text-primary">&#123;</span><br />
                <span className="pl-4">craft: <span className="text-foreground">&quot;thoughtful websites&quot;</span>,</span><br />
                <span className="pl-4">always: <span className="text-foreground">&quot;learning&quot;</span></span><br />
                <span className="text-primary">&#125;;</span>
              </div>
            </div>
            <div className="studio-float studio-float-top"><Braces size={19} /><span>Built with curiosity</span></div>
            <div className="studio-float studio-float-bottom"><Sparkles size={18} /><span>A little detail. A lot of care.</span></div>
          </Reveal>
        </div>
        <div className="studio-hero-footer mt-16 flex items-center justify-between gap-4 border-t border-border/60 pt-6">
          <Link href="#experiences" className="group inline-flex items-center gap-3 text-xs text-muted-foreground"><span className="studio-scroll"><ArrowDown size={14} /></span> Scroll to discover</Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Thoughtfully designed. Carefully built.</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
