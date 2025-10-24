// "use client";

// import { useEffect, useState } from "react";
// import { Card, CardHeader, CardContent } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Section } from "@/components/ui/section";
// import {
//   MailIcon,
//   ArrowRight,
//   FileDown,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { RESUME_DATA } from "@/data/resume-data";
// import { ProjectCard } from "@/components/project-card";
// import { HoverNavbar } from "@/components/hover-navbar";
// import { motion, AnimatePresence } from "framer-motion";
// import { InteractiveSkills } from "@/components/interactive-skills";
// import { WorkTimeline } from "@/components/work-timeline";
// import { HyperText } from "@/components/magicui/hyper-text";
// import { ThemeSwitcher } from "@/components/theme-switcher";

// // Name animation overlay component
// const NameAnimation = () => {
//   const [visible, setVisible] = useState(true);

//   useEffect(() => {
//     // Prevent page scrolling during animation
//     if (visible) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "";
//     }

//     const timer = setTimeout(() => {
//       setVisible(false);
//     }, 2200); // Animation stays for 2.2 seconds (faster than before)

//     return () => {
//       clearTimeout(timer);
//       document.body.style.overflow = "";
//     };
//   }, [visible]);

//   const nameWords = RESUME_DATA.name.split(" ");

//   return (
//     <AnimatePresence>
//       {visible && (
        // <motion.div
        //   initial={{ opacity: 0 }}
        //   animate={{ opacity: 1 }}
        //   exit={{ opacity: 0 }}
        //   transition={{ duration: 0.5 }} // Faster fade in/out
        //   className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        // >
//           <div className="relative">
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 0.05 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.4 }} // Faster background animation
//               className="absolute inset-0 -z-10"
//               style={{
//                 backgroundImage:
//                   "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)",
//                 backgroundSize: "50px 50px",
//               }}
//             />

//             {/* Name with HyperText animation */}
//             <div className="relative flex flex-wrap justify-center gap-x-4 text-center text-4xl font-bold sm:text-6xl lg:text-9xl">
//               {nameWords.map((word, index) => (
//                 <motion.div
//                   key={index}
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   transition={{ delay: 0.1 * index, duration: 0.5 }} // Faster animation with shorter delay
//                   className="overflow-hidden"
//                 >
//                   <HyperText className="bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl lg:text-9xl">
//                     {word}
//                   </HyperText>
//                 </motion.div>
//               ))}
//             </div>

//             {/* About text with HyperText */}
//             <motion.div
//               className="text-center md:mt-10"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ delay: 0.6 }} // Faster appearance of about text
//             >
//               <HyperText className="text-sm tracking-wide text-gray-600">
//                 {RESUME_DATA.about}
//               </HyperText>
//             </motion.div>
//           </div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };

// // Type definition for GitHub repository data
// interface Repository {
//   id: number;
//   name: string;
//   html_url: string;
//   description: string | null;
//   stargazers_count: number;
//   forks_count: number;
//   topics: string[];
//   language: string | null;
//   owner?: {
//     login: string;
//     avatar_url: string;
//   };
// }

// export default function Page() {
//   const [repoData, setRepoData] = useState<Repository[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [animationComplete, setAnimationComplete] = useState(false);

//   // Command menu links
//   const commandLinks = [
//     {
//       url: RESUME_DATA.personalWebsiteUrl,
//       title: "Personal Website",
//     },
//     {
//       url: "/blog",
//       title: "Blog",
//     },
//     ...RESUME_DATA.contact.social.map((socialMediaLink) => ({
//       url: socialMediaLink.url,
//       title: socialMediaLink.name,
//     })),
//   ];

//   useEffect(() => {
//     // Set animation complete after 4 seconds (slightly longer than the animation duration)
//     const timer = setTimeout(() => {
//       setAnimationComplete(true);
//     }, 2000);

//     return () => clearTimeout(timer);
//   }, []);

//   const container = {
//     hidden: { opacity: 0 },
//     show: {
//       opacity: 1,
//       transition: {
//         staggerChildren: 0.1,
//       },
//     },
//   };

//   const item = {
//     hidden: { opacity: 0, y: 20 },
//     show: { opacity: 1, y: 0 },
//   };

//   return (
//     <main className="container relative mx-auto scroll-my-12 overflow-auto p-4 md:p-16 print:p-12 bg-background">
//       {/* Add the name animation component */}
//       <NameAnimation />

//       {/* Only show content after animation completes */}
//       <AnimatePresence>
//         {animationComplete && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ duration: 0.8 }}
//           >
//             <HoverNavbar links={commandLinks} />
//             <motion.section
//               id="top"
//               className="mx-auto w-full max-w-4xl space-y-8 bg-background print:space-y-6"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5 }}
//             >
//               <div className="flex items-center gap-6">
//                 <motion.div
//                   whileHover={{ scale: 1.05 }}
//                   transition={{ type: "spring", stiffness: 300 }}
//                 >
//                   <Avatar className="size-28">
//                     <AvatarImage
//                       className="object-cover"
//                       alt={RESUME_DATA.name}
//                       src={RESUME_DATA.avatarUrl}
//                     />
//                     <AvatarFallback>{RESUME_DATA.initials}</AvatarFallback>
//                   </Avatar>
//                 </motion.div>
//                 <div className="flex-1 space-y-1.5">
//                   <h1 className="text-2xl font-medium">{RESUME_DATA.name}</h1>
//                   <p className="max-w-md text-sm text-muted-foreground">
//                     {RESUME_DATA.about}
//                   </p>
//                   <div className="flex gap-x-1 pt-1 text-sm text-muted-foreground print:hidden">
//                     {RESUME_DATA.contact.email ? (
//                       <Button
//                         className="size-8"
//                         variant="outline"
//                         size="icon"
//                         asChild
//                       >
//                         <a href={`mailto:${RESUME_DATA.contact.email}`}>
//                           <MailIcon className="size-4" />
//                         </a>
//                       </Button>
//                     ) : null}
//                     {RESUME_DATA.contact.social.map((social) => (
//                       <Button
//                         key={social.name}
//                         className="size-8"
//                         variant="outline"
//                         size="icon"
//                         asChild
//                       >
//                         <a
//                           href={social.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           <social.icon className="size-4" />
//                         </a>
//                       </Button>
//                     ))}
//                     <Button
//                       variant="outline"
//                       className="flex h-8 items-center gap-2"
//                       asChild
//                     >
//                       <a
//                         href={RESUME_DATA.resumeUrl}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         download
//                       >
//                         <FileDown className="size-4" />
//                         <span>Download CV</span>
//                       </a>
//                     </Button>
//                     <ThemeSwitcher />
//                   </div>
//                   <div className="hidden flex-col gap-x-1 text-sm text-muted-foreground print:flex">
//                     {RESUME_DATA.contact.email ? (
//                       <a href={`mailto:${RESUME_DATA.contact.email}`}>
//                         <span className="underline">
//                           {RESUME_DATA.contact.email}
//                         </span>
//                       </a>
//                     ) : null}
//                   </div>
//                 </div>
//               </div>

//               <Section id="about">
//                 <div className="flex items-center justify-between">
//                   <h2 className="text-xl font-medium">About</h2>
//                 </div>
//                 <p className="text-pretty text-sm text-muted-foreground">
//                   {RESUME_DATA.summary}
//                 </p>
//               </Section>

//               <Section id="work" className="scroll-mt-16">
//                 <h2 className="text-xl font-medium">Work Experience</h2>
//                 <WorkTimeline experiences={RESUME_DATA.work} />
//               </Section>

//               <Section id="skills" className="scroll-mt-16">
//                 <h2 className="text-xl font-medium">Skills</h2>
//                 <div className="mt-5">
//                   <InteractiveSkills skills={RESUME_DATA.skills} />
//                 </div>
//               </Section>

//               <Section
//                 id="projects"
//                 className="print-force-new-page scroll-mt-16"
//               >
//                 <h2 className="text-xl font-medium">Projects</h2>
//                 <div className="-mx-3 mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
//                   {RESUME_DATA.projects.map((project, index) => (
//                     <motion.div
//                       key={project.title}
//                       initial={{ opacity: 0, y: 20 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: index * 0.1 }}
//                     >
//                       <ProjectCard
//                         title={project.title}
//                         description={project.description}
//                         tags={project.techStack}
//                         link={"link" in project ? project.link.href : undefined}
//                       />
//                     </motion.div>
//                   ))}
//                 </div>
//               </Section>
//               <Section id="education" className="scroll-mt-16">
//                 <h2 className="text-xl font-medium">Education</h2>
//                 <div className="mt-4 space-y-4">
//                   {RESUME_DATA.education.map((education) => (
//                     <Card
//                       key={education.school}
//                       className="overflow-hidden border border-border p-4 transition-all hover:shadow-xs"
//                     >
//                       <CardHeader>
//                         <div className="flex items-center justify-between gap-x-2 text-base">
//                           <h3 className="font-semibold leading-none">
//                             {education.school}
//                           </h3>
//                           <div className="text-sm tabular-nums text-gray-500">
//                             {education.start} - {education.end}
//                           </div>
//                         </div>
//                       </CardHeader>
//                       <CardContent className="mt-2">
//                         {education.degree}
//                       </CardContent>
//                     </Card>
//                   ))}
//                 </div>
//               </Section>
//             </motion.section>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </main>
//   );
// }



"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Section } from "@/components/ui/section";
import {
  MailIcon,
  ArrowRight,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESUME_DATA } from "@/data/resume-data";
import { ProjectCard } from "@/components/project-card";
import { HoverNavbar } from "@/components/hover-navbar";
import { motion, AnimatePresence } from "framer-motion";
import { InteractiveSkills } from "@/components/interactive-skills";
import { WorkTimeline } from "@/components/work-timeline";
import { HyperText } from "@/components/magicui/hyper-text";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { HoverTextGlow } from "@/components/hover-text-glow";
import { Badge } from "@/components/ui/badge";
import { ArrowsPointingOutIcon, CalendarIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/footer";

// Name animation overlay component
// const NameAnimation = () => {
//   const [visible, setVisible] = useState(true);

//   useEffect(() => {
//     // Prevent page scrolling during animation
//     if (visible) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "";
//     }

//     const timer = setTimeout(() => {
//       setVisible(false);
//     }, 2200); // Animation stays for 2.2 seconds (faster than before)

//     return () => {
//       clearTimeout(timer);
//       document.body.style.overflow = "";
//     };
//   }, [visible]);

//   const nameWords = RESUME_DATA.name.split(" ");

//   return (
//     <AnimatePresence>
//       {visible && (
        // <motion.div
        //   initial={{ opacity: 0 }}
        //   animate={{ opacity: 1 }}
        //   exit={{ opacity: 0 }}
        //   transition={{ duration: 0.5 }} // Faster fade in/out
        //   className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        // >
//           <div className="relative">
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 0.05 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.4 }} // Faster background animation
//               className="absolute inset-0 -z-10"
//               style={{
//                 backgroundImage:
//                   "radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)",
//                 backgroundSize: "50px 50px",
//               }}
//             />

//             {/* Name with HyperText animation */}
//             <div className="relative flex flex-wrap justify-center gap-x-4 text-center text-4xl font-bold sm:text-6xl lg:text-9xl">
//               {nameWords.map((word, index) => (
//                 <motion.div
//                   key={index}
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   transition={{ delay: 0.1 * index, duration: 0.5 }} // Faster animation with shorter delay
//                   className="overflow-hidden"
//                 >
//                   <HyperText className="bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl lg:text-9xl">
//                     {word}
//                   </HyperText>
//                 </motion.div>
//               ))}
//             </div>

//             {/* About text with HyperText */}
//             <motion.div
//               className="text-center md:mt-10"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ delay: 0.6 }} // Faster appearance of about text
//             >
//               <HyperText className="text-sm tracking-wide text-gray-600">
//                 {RESUME_DATA.about}
//               </HyperText>
//             </motion.div>
//           </div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };


const NameAnimation = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Prevent page scrolling during animation
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // const timer = setTimeout(() => {
    //   setVisible(false);
    // }, 2200);

    return () => {
      // clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [visible]);

  const nameWords = RESUME_DATA.name.split(" ");

  return (
    <AnimatePresence>
      {visible && (
         <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1, transition: { duration: 1.5 } }}
         exit={{ opacity: 0, transition: { duration: 0.2 } }}
         onAnimationComplete={() => setVisible(false)}
        //  onExitComplete={() => setVisible(false)}
         className="absolute inset-0 z-50 flex flex-col items-center justify-center"
       >
        {/* <div className="absolute inset-0 z-50 flex flex-col items-center justify-center"> */}
        
            {/* Name with HyperText animation */}
            <HoverTextGlow text={RESUME_DATA.name} duration={0.1} />

            {/* About text with HyperText */}
            <motion.div
              className="text-center md:mt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <HyperText className="text-sm tracking-wide text-foreground/80">
                {RESUME_DATA.about}
              </HyperText>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Type definition for GitHub repository data
interface Repository {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  language: string | null;
  owner?: {
    login: string;
    avatar_url: string;
  };
}

export default function Page() {
  const [repoData, setRepoData] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Command menu links
  const commandLinks = [
    {
      url: RESUME_DATA.personalWebsiteUrl,
      title: "Personal Website",
    },
    {
      url: "/blog",
      title: "Blog",
    },
    ...RESUME_DATA.contact.social.map((socialMediaLink) => ({
      url: socialMediaLink.url,
      title: socialMediaLink.name,
    })),
  ];

  useEffect(() => {
    // Set animation complete after 4 seconds (slightly longer than the animation duration)
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="bg-card border-y">
      {/* Add the name animation component */}
      <NameAnimation />

      {/* Only show content after animation completes */}
      <AnimatePresence>
        {animationComplete && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center border-b border-x p-3">
              <p className="text-muted-foreground text-xs">
                © {new Date().getFullYear()} Ben Cheesebrough. All rights reserved.
              </p>
            </div>
            {/* <HoverNavbar links={commandLinks} /> */}
            <motion.section
              id="top"
              className="w-full bg-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* <div className="w-full max-w-6xl mx-auto border-x border-b dark:bg-card bg-background">
                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>
                <div className="w-full h-px bg-border" />
                <div className="flex gap-6 mx-8 border-x px-4 lg:px-8 pt-12 pb-12">
                  <div className="flex flex-1 gap-6">
                    <Avatar className="size-28">
                      <AvatarImage
                        className="object-cover"
                        alt={RESUME_DATA.name}
                        src={RESUME_DATA.avatarUrl}
                      />
                      <AvatarFallback>{RESUME_DATA.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5">
                      <h1 className="text-2xl font-medium">{RESUME_DATA.name}</h1>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {RESUME_DATA.about}
                      </p>
                      <div className="flex gap-x-1 pt-1 text-sm text-muted-foreground print:hidden">
                        {RESUME_DATA.contact.email ? (
                          <Button
                            className="size-8"
                            variant="outline"
                            size="icon"
                            asChild
                          >
                            <a href={`mailto:${RESUME_DATA.contact.email}`}>
                              <MailIcon className="size-4" />
                            </a>
                          </Button>
                        ) : null}
                        {RESUME_DATA.contact.social.map((social) => (
                          <Button
                            key={social.name}
                            className="size-8"
                            variant="outline"
                            size="icon"
                            asChild
                          >
                            <a
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <social.icon className="size-4" />
                            </a>
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          className="flex h-8 items-center gap-2"
                          asChild
                        >
                          <a
                            href={RESUME_DATA.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            <FileDown className="size-4" />
                            <span>Download CV</span>
                          </a>
                        </Button>
                        <ThemeSwitcher />
                      </div>
                      <div className="hidden flex-col gap-x-1 text-sm text-muted-foreground print:flex">
                        {RESUME_DATA.contact.email ? (
                          <a href={`mailto:${RESUME_DATA.contact.email}`}>
                            <span className="underline">
                              {RESUME_DATA.contact.email}
                            </span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="w-px -my-12 bg-border" />

                  <div className="flex-1">
                    <p className="text-xl font-medium">
                      About
                    </p>
                    <p className="text-pretty text-sm text-muted-foreground text-justify mt-4">
                      {RESUME_DATA.summary}
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-border" />
                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>
              </div> */}

              <div className="w-full max-w-6xl mx-auto border-x border-b dark:bg-card bg-background">

                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>

                <div className="w-full h-px bg-border" />
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mx-8 border-x px-4 lg:px-8 pt-12 pb-12">
                  <Avatar className="size-28">
                    <AvatarImage
                      className="object-cover"
                      alt={RESUME_DATA.name}
                      src={RESUME_DATA.avatarUrl}
                    />
                    <AvatarFallback>{RESUME_DATA.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col lg:flex-row justify-center space-y-1.5 lg:justify-between lg:w-full lg:items-center">

                    <div className="text-center sm:text-left">
                      <h1 className="text-2xl font-medium">{RESUME_DATA.name}</h1>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {RESUME_DATA.about}
                      </p>
                    </div>

                    <div className="hidden sm:flex lg:flex-col gap-x-1 gap-y-1 pt-1 text-sm text-muted-foreground">
                      <div className="flex gap-x-1 justify-between">
                        <Button
                          className="size-8"
                          variant="outline"
                          size="icon"
                          asChild
                        >
                          <a href={`mailto:${RESUME_DATA.contact.email}`}>
                            <MailIcon className="size-4" />
                          </a>
                        </Button>
                        {RESUME_DATA.contact.social.map((social) => (
                          <Button
                            key={social.name}
                            className="size-8"
                            variant="outline"
                            size="icon"
                            asChild
                          >
                            <a
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <social.icon className="size-4" />
                            </a>
                          </Button>
                        ))}
                        <ThemeSwitcher />
                      </div>
                      <Button
                        variant="outline"
                        className="flex h-8 w-fit items-center gap-2"
                        asChild
                      >
                        <a
                          href={RESUME_DATA.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <FileDown className="size-4" />
                          <span>Download CV</span>
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="sm:hidden flex w-full flex-col items-center gap-1 pt-1 text-sm text-muted-foreground mx-4">
                    <div className="flex gap-2">
                      <Button
                        className="size-10"
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <a href={`mailto:${RESUME_DATA.contact.email}`}>
                          <MailIcon className="size-4" />
                        </a>
                      </Button>
                      {RESUME_DATA.contact.social.map((social) => (
                        <Button
                          key={social.name}
                          className="size-10"
                          variant="outline"
                          size="icon"
                          asChild
                        >
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <social.icon className="size-4" />
                          </a>
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <ThemeSwitcher />
                      <Button
                        variant="outline"
                        className="flex h-8 w-fit items-center gap-2 px-3.5"
                        asChild
                      >
                        <a
                          href={RESUME_DATA.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <FileDown className="size-4" />
                          <span>Download CV</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-border" />
                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>
              </div>


              <div id="about" className="max-w-6xl mx-auto border-x py-12 bg-background px-4 xl:px-0">
                <div className="flex flex-col items-start max-w-5xl mx-auto w-full">
                  <h2 className="text-xl font-medium">About</h2>
                  <p className="text-pretty text-sm text-muted-foreground text-justify pt-4">
                    {RESUME_DATA.summary}
                  </p>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div id="work" className="py-12 max-w-6xl mx-auto border-x bg-background px-4 xl:px-0">
                <div className="sm:flex items-center justify-between max-w-5xl mx-auto">
                  <h2 className="text-xl font-medium">Work Experience</h2>
                  <Badge variant="outline" className="flex text-xs text-muted-foreground font-normal px-0 sm:px-3 py-1.25 gap-2 w-fit mt-5 -mb-6 sm:mb-0 sm:mt-0 border-0 sm:border">
                    <ArrowsPointingOutIcon className="size-4" />
                    <span>Press an item to see more</span>
                  </Badge>
                </div>
                <div className="max-w-5xl mx-auto mt-8">
                  <WorkTimeline experiences={RESUME_DATA.work} />
                </div>
              </div>

              <div className="h-px w-full bg-border" />
                    
              {/* <div id="skills" className="max-w-6xl mx-auto border-x py-12 bg-background px-4 xl:px-0">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-xl font-medium">Skills</h2>
                  <div className="mt-5">
                    <InteractiveSkills skills={RESUME_DATA.skills} />
                  </div>
                </div>
              </div> */}

              <div className="h-px w-full bg-border" />

              {/* <div
                id="projects"
                className="max-w-6xl mx-auto border-x py-12 bg-background"
              >
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-xl font-medium">Projects</h2>
                  <div className="-mx-3 mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
                    {RESUME_DATA.projects.map((project, index) => (
                      <motion.div
                        key={project.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ProjectCard
                          title={project.title}
                          description={project.description}
                          tags={project.techStack}
                          link={"link" in project ? project.link.href : undefined}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div> */}

              <div
                id="projects"
                className="max-w-6xl mx-auto border-x dark:bg-card bg-background"
              >
                {/* <div className="mx-8 border-x pb-4 pt-12">
                  <h2 className="text-xl font-medium max-w-5xl mx-auto">Key Achievements</h2>
                </div> */}
                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>
                <div className="border-x h-px bg-border" />

                <div className="flex flex-col mx-8 border-x pb-8 pt-8 bg-background">
                  <p className="uppercase text-[14px] font-normal text-primary tracking-wide max-w-5xl mx-auto">Key Achievements</p>
                  <p className="text-charcoal-700 max-w-5xl mx-auto text-2xl font-medium tracking-tight md:text-3xl lg:text-4xl dark:text-neutral-100 mt-4">So far...</p>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="mx-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch border-l">
                  {RESUME_DATA.achievements.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="h-full overflow-hidden"
                    >
                      <ProjectCard
                        title={item.title}
                        description={item.content}
                        icon={item.icon}
                        idx={index}
                      />
                    </motion.div>
                  ))}
                  {RESUME_DATA.achievements.length % 3 == 1 && (
                    <motion.div
                      key={"Placeholder"}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (RESUME_DATA.achievements.length) * 0.1 }}
                      className="h-full relative overflow-hidden border-r"
                    >
                      <div className="blur-sm hidden md:block">
                        <ProjectCard 
                          title={RESUME_DATA.achievements[0].title} 
                          description={RESUME_DATA.achievements[0].content} 
                          icon={RESUME_DATA.achievements[0].icon} 
                          idx={RESUME_DATA.achievements.length} 
                        />
                      </div>
                      <div className="z-10 absolute inset-px bg-background/10">
                        <p className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-muted-foreground font-semibold text-sm uppercase tracking-wider">Coming soon...</p>
                      </div>
                    </motion.div>
                  )}
                  {RESUME_DATA.achievements.length % 3 == 1 && (
                    <motion.div
                      key={"Placeholder 2"}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (RESUME_DATA.achievements.length) * 0.1 }}
                      className="h-full relative overflow-hidden hidden lg:block border-r"
                    >
                      <div className="blur-sm">
                        <ProjectCard 
                          title={RESUME_DATA.achievements[2].title} 
                          description={RESUME_DATA.achievements[2].content} 
                          icon={RESUME_DATA.achievements[2].icon} 
                          idx={RESUME_DATA.achievements.length + 1} 
                        />
                      </div>
                      <div className="z-10 absolute inset-px bg-background/10">
                        <p className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-muted-foreground font-semibold text-sm uppercase tracking-wider">Coming soon...</p>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="w-full h-px bg-border" />
                
                {/* <div className="mx-8 border-x pb-8" /> */}
                <div className="h-8 dark:bg-background bg-card">
                  <div className="h-full mx-8 dark:bg-card bg-background border-x" />
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div id="education" className="max-w-6xl mx-auto border-x py-12 bg-background">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-xl font-medium ml-4 lg:ml-0">Education</h2>
                  <div className="mt-4">
                    {RESUME_DATA.education.map((education, idx) => (
                      <div className={`group flex w-full flex-col rounded-lg hover:rounded-xl`}>
                        <div className="flex items-stretch">
                          <div className="flex items-center justify-center relative">
                            {idx == 0 ? 
                                <div className="w-2 h-2 bg-primary ring-3 ring-primary/20 rounded-full mx-4 z-1" />
                              :
                                <div className="w-1.5 h-1.5 translate-x-px bg-primary/20 ring ring-primary rounded-full mx-4 z-1" />
                            }
                            {idx == 1 && <div className="absolute w-px translate-x-px top-[calc(50%+4px)] bottom-0 bg-linear-to-b from-primary/80 to-primary/50 z-0" />}
                            {idx == 0 && <div className="absolute w-px top-[calc(50%+4px)] bottom-0 bg-linear-to-b from-primary/80 to-primary/50 z-0" />}
                            {idx != 0 && <div className="absolute w-px translate-x-px bottom-[calc(50%+4px)] top-0 bg-linear-to-t from from-primary/80 to-primary/50 z-0" />}
                          </div>

                          <Item variant="outline" className="mr-4 w-full gap-0! group-hover:rounded-xl transition-all duration-300 overflow-hidden flex-col my-2">

                            <div className="flex w-full">

                              <ItemMedia className="flex sm:h-full items-center translate-none! sm:self-center!">
                                <Avatar className="size-10 flex items-center justify-center">
                                  <AvatarImage key={education.logo} src={education.logo} />
                                  <AvatarFallback>{education.school.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </ItemMedia>

                              <ItemContent className="flex flex-col ml-4">

                                <ItemTitle className="flex flex-col items-start sm:flex-row justify-between w-full">

                                  <div className="items-center gap-2 hidden lg:flex">
                                      {education.title}
                                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px rounded-full bg-primary group-hover/underline:w-full transition-all duration-150" />
                                    <span className="text-muted-foreground font-light">-</span>
                                    <div className="flex flex-row text-muted-foreground items-center font-normal">
                                      {education.school}
                                    </div>
                                  </div>
                                  <div className="items-center gap-2 flex-col lg:hidden">
                                      {education.title}
                                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px rounded-full bg-primary group-hover/underline:w-full transition-all duration-150" />
                                    <div className="flex flex-row text-muted-foreground items-center font-normal mt-0.5">
                                      {education.school}
                                    </div>
                                  </div>
                                
                                
                                  <div className="flex-row items-center gap-2 font-light text-sm hidden lg:flex">
                                    <div className="flex flex-row items-center gap-1">
                                      <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
                                      {education.start}{education.end && ` - ${education.end}`}
                                    </div>
                                    <Separator className="flex h-4 bg-muted-foreground/70 rounded-full ml-1" orientation="vertical" />
                                    <div className="flex flex-row items-center gap-1">
                                      <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
                                      {education.location}
                                    </div>
                                  </div>
                                  <div className="items-start gap-2 font-light text-sm flex flex-col lg:hidden">
                                    <div className="flex flex-row items-center gap-1">
                                      <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
                                      {education.start}{education.end && ` - ${education.end}`}
                                    </div>
                                    <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                                      <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
                                      {education.location}
                                    </div>
                                  </div>
                                 </ItemTitle>

                                <ItemDescription className="flex w-full mt-0.5 justify-start items-center overflow-visible">
                                  <div className="flex flex-wrap gap-2">
                                    {(education as any).grades?.map((badge: string, idx: number) => (
                                      <Badge key={badge} variant="outline" className="text-xs text-primary rounded-sm font-normal border-none bg-primary/10" >
                                        {badge}
                                      </Badge>
                                    ))}
                                  </div>
                                </ItemDescription>
                              </ItemContent>
                            </div>
                          </Item>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Footer />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
