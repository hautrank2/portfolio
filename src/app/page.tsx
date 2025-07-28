import Image from "next/image";
import Header from "~/components/layouts/header";
import { Typography } from "~/components/ui/typography";
import Experiences from "./components/Experiences";
import SectionHeadline from "./components/SectionHeadline";
import ProjectSection from "./components/ProjectSection";
import { cn } from "~/lib/utils";
import Script from "next/script";
import Contact from "./components/Contact";

export default function Home() {
  const stacks = [
    {
      title: "Frontend",
    },
    {
      title: "Backend",
    },
    {
      title: "UI/UX",
    },
  ];

  const maxWidth = "max-w-[80rem]";
  const sectionClassName = `${maxWidth} mx-auto min-h-[86vh] p-16 opacity-0`;
  return (
    <div className="pt-20">
      <Header />
      <section id="banner" className={cn(sectionClassName)}>
        <div className="flex items-center mx-auto">
          <div className="flex-[1] pe-16">
            <Typography
              variant="h1"
              className="text-bold mb-4 text-8xl uppercase"
            >
              <span className="block">I am</span> <span>Hau Tran</span>
            </Typography>
            <Typography variant="h1" className="leading-[1.2] mb-8">
              Web developer
            </Typography>
            <Typography
              variant="h5"
              className="mb-2 text-2xl font-normal leading-[1.2]"
            >
              I studied software engineering at Ho Chi Minh City University of
              Technology and Education{" "}
              <a
                href="https://hcmute.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                (HCMUTE)
              </a>
            </Typography>
            <Typography
              variant="h5"
              className="font-normal text-2xl leading-[1.2]"
            >
              Of all the software, I especially like websites. I want to develop
              websites that are friendly, useful, where people can go there to
              do something
            </Typography>

            <div className="flex flex-wrap gap-8 px-8 mt-8">
              {stacks.map((stack) => (
                <div
                  key={stack.title}
                  className="px-4 py-2 rounded-full border"
                >
                  <Typography variant={"p"}>{stack.title}</Typography>
                </div>
              ))}
            </div>
          </div>
          <Image
            className="rounded-full hidden lg:block"
            src="/img/avt.jpg"
            alt="avatar"
            width={320}
            height={320}
          />
        </div>
      </section>

      <section id="experiences" className={cn(sectionClassName, "mx-auto")}>
        <SectionHeadline title="Experiences" href="experiences" />
        <Experiences />
      </section>

      <section
        id="projects"
        className={cn(sectionClassName, "bg-primary/10 max-w-screen")}
      >
        <div className={cn(maxWidth, "mx-auto")}>
          <SectionHeadline title="Projects" href="projects" />
          <ProjectSection />
        </div>
      </section>

      <section
        id="contact"
        className={cn(
          sectionClassName,
          "max-w-screen border-t min-h-auto bg-[url(/svg/bg-gr.svg)] bg-no-repeat"
        )}
      >
        <Contact />
      </section>

      <Script id="homeScript" strategy="afterInteractive" src="/js/app.js" />
    </div>
  );
}
