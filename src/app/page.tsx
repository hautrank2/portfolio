import Image from "next/image";
import Header from "~/components/layouts/header";
import { Typography } from "~/components/ui/typography";
import Experiences from "./Experiences";

export default function Home() {
  const stacks = [
    {
      title: "Frontend",
    },
    {
      title: "Backend",
    },
    {
      title: "Design",
    },
  ];
  return (
    <div className="pt-20">
      <Header />
      <section id="banner" className="mx-auto p-16 min-h-[86vh]">
        <div className="container flex items-center mx-auto px-32 ">
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

            <div className="flex gap-8 px-8 mt-8">
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
            className="rounded-full"
            src="/img/avt.jpg"
            alt="avatar"
            width={320}
            height={320}
          />
        </div>
      </section>

      <section id="experience" className="mx-auto p-16 max-w-[80vw]">
        <Typography variant="h1" className="mb-4 border-b">
          Experiences
        </Typography>
        <Experiences />
      </section>
    </div>
  );
}
