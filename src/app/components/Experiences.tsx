import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { Typography } from "~/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Notebook } from "lucide-react";
import Link from "next/link";

function Experiences({}) {
  const data = [
    {
      company: "HCMC university of Technology and Education",
      href: "https://hcmute.edu.vn",
      duration: "Sep 2020 - Jul 2024",
      des: "I studied IT here with a major in Software Engineering. During my 4 years, I had some activities at the media group and received Prize for Student of 5 merits",
      projects: [
        {
          title: "Prize for Student of 5 merits",
          description: "January 2024",
          imageUrl:
            "https://res.cloudinary.com/dhl9sisnc/image/upload/v1753499927/my-self/university/prize-5.jpg",
        },
        {
          title: "Prize for Student of 5 merits",
          description: "January 2024",
          imageUrl:
            "https://res.cloudinary.com/dhl9sisnc/image/upload/v1753500033/my-self/university/prize-5-seft.jpg",
        },
      ],
    },
    {
      company: "Becamex IDC",
      href: "https://becamex.com.vn",
      duration: "Mar 2023 - present",
      des: "As a Frontend developer, I am involved in UI/UX design and website development",
      projects: [
        {
          title: "Nha Trang",
          description: "August 2024",
          imageUrl:
            "https://res.cloudinary.com/dhl9sisnc/image/upload/v1753499817/my-self/bcm/smic-nha_trang_sjduem.jpg",
        },
        {
          title: "Receive certificate of merit from the product manager",
          description: "January 2025",
          imageUrl:
            "https://res.cloudinary.com/dhl9sisnc/image/upload/v1753499791/my-self/bcm/orion_nnn_hvikt6.jpg",
        },
        {
          title: "Team building",
          description: "June 2025",
          imageUrl:
            "https://res.cloudinary.com/dhl9sisnc/image/upload/v1753500793/my-self/bcm/teambuilding2025_ysqkrn.jpg",
        },
      ],
    },
  ];
  return (
    <div className="mt-4 ps-12 pt-8 max-w-4xl mx-auto">
      {data.map((exp, ix) => {
        return (
          <div
            key={exp.company + ix}
            className="flex gap-4 relative border-s-4 border-primary py-8 px-6"
          >
            <div className="dot rounded-full h-4 w-4 bg-primary absolute top-0 left-[-10px]"></div>
            <Exp exp={exp} />
          </div>
        );
      })}
    </div>
  );
}

interface Experience {
  company: string;
  duration: string;
  des: string;
  href: string;
  projects: {
    title: string;
    description: string;
    imageUrl: string;
  }[];
}

const Exp = ({ exp }: { exp: Experience }) => {
  return (
    <div
      key={exp.company}
      className="rounded-lg bg-primary/10 border border-primary/80 p-8"
    >
      <div className="flex gap-4 items-center">
        <Link target="_blank" href={exp.href}>
          <Typography variant="h2" className="hover:text-primary">
            {exp.company}
          </Typography>
        </Link>
        {exp.projects.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Notebook className="hover:cursor-pointer" size={16} />
            </DialogTrigger>
            <DialogContent className="w-screen md:max-w-[80vw]">
              <DialogHeader>
                <DialogTitle>{exp.company}</DialogTitle>
                <DialogDescription>{exp.duration}</DialogDescription>
              </DialogHeader>
              <Carousel className="w-full max-w-[80%] mx-auto mt-4">
                <CarouselContent>
                  {exp.projects.map((project, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardHeader>
                            <CardTitle>{project.title}</CardTitle>
                            <CardDescription>
                              {project.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex relative aspect-square items-center justify-center p-6 max-h-[460px]">
                            <Image
                              alt={project.imageUrl}
                              fill
                              src={project.imageUrl}
                              className="object-contain rounded"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Typography variant="h5" className="font-normal mb-4">
        {exp.duration}
      </Typography>
      <Typography variant="p" className="font-normal">
        {exp.des}
      </Typography>
    </div>
  );
};

export default Experiences;
