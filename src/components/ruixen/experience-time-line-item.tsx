// "use client";

// import { motion } from "framer-motion";
// import Image from "next/image";
// import Link from "next/link";
// import { ArrowUpRightIcon, BriefcaseIcon } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { companyLogos } from "@/data/experience-data";

// interface ExperienceTimelineItemProps {
//   work: WorkExperience;
//   index: number;
// }

// export const ExperienceTimelineItem: React.FC<ExperienceTimelineItemProps> = ({
//   work,
//   index,
// }) => {
//   const logoSrc = companyLogos[work.company];

//   return (
//     <motion.div
//       className="relative"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       exit={{ opacity: 0, y: -20 }}
//       transition={{ delay: index * 0.1 }}
//     >


//       <div className="group flex gap-4">
//         {/* Timeline icon or logo */}
//         <div className="relative z-10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-muted bg-background shadow-md">
//           {logoSrc ? (
//             <Image
//               src={logoSrc}
//               alt={`${work.company} logo`}
//               fill
//               className="object-cover p-1"
//             />
//           ) : (
//             <BriefcaseIcon className="h-5 w-5 text-primary/80 transition-colors duration-300 group-hover:text-primary" />
//           )}
//         </div>

//         {/* Content */}
//         <div className="flex-1 pb-2">

//           <div className="rounded-lg border border-muted bg-card p-4 shadow-xs transition-all duration-300 hover:bg-card/95 hover:shadow-sm group-hover:border-muted/80">
//             <div className="mb-1 flex flex-col justify-between gap-2 md:flex-row md:items-center">
//               <div className="flex items-center gap-2">
//                 <h3 className="text-base font-medium">
//                   <Link
//                     href={work.link}
//                     className="transition-colors duration-300 hover:text-primary"
//                   >
//                     {work.company}
//                   </Link>
//                 </h3>
//                 {work.star_tag && <Badge className="bg-blue-100 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-200">
//                   {work.star_tag}
//                 </Badge>
//                 }
//               </div>
//               <div className="text-sm tabular-nums text-muted-foreground">
//                 {work.start} - {work.end ?? "Present"}
//               </div>
//             </div>

//             <div className="mb-2 flex flex-wrap gap-1">
//               <span className=" text-sm font-medium text-gray-700">
//                 {work.title}
//               </span>
//               <div className="flex-1" />
//               {work.badges.map((badge) => (
//                 <Badge key={badge} variant="outline" className="text-xs">
//                   {badge}
//                 </Badge>
//               ))}
//             </div>
//             <p className="mt-2 text-sm text-muted-foreground">
//               {work.description}
//             </p>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// };

// import {
//   Avatar,
//   AvatarFallback,
//   AvatarImage,
// } from "@/components/ui/avatar"
// import { Button } from "@/components/ui/button"
// import {
//   Item,
//   ItemActions,
//   ItemContent,
//   ItemDescription,
//   ItemMedia,
//   ItemTitle,
// } from "@/components/ui/item"
// import Link from "next/link";
// import { CalendarIcon, MapPinIcon } from "@heroicons/react/24/solid";
// import { Separator } from "../ui/separator";
// import { Badge } from "../ui/badge";

// interface ExperienceTimelineItemProps {
//   work: WorkExperience;
//   index: number;
// }

// export function ExperienceTimelineItem({ work, index }: ExperienceTimelineItemProps) {
//   return (
//     <div className="flex w-full flex-col">
//       <Item variant="outline">
//         <ItemMedia>
//           {work.animatedLogo ? 
//             <Avatar className="size-10 flex items-center justify-center overflow-visible">
//               {work.animatedLogo}
//             </Avatar> 
//             : 
//             <Avatar className="size-10 flex items-center justify-center">
//               <AvatarImage key={work.logo} src={work.logo} />
//               <AvatarFallback>{work.company.charAt(0)}</AvatarFallback>
//             </Avatar>
//           }

//         </ItemMedia>
//         <ItemContent className="flex flex-col">
//           <ItemTitle className="flex flex-row justify-between w-full">
//             <Link target="_blank" href={work.link}>
//               {work.company}
//             </Link>
//             <div className="flex flex-row items-center gap-2 font-light text-sm">
//               <div className="flex flex-row items-center gap-1">
//                 <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
//                 {work.start}{work.end && ` - ${work.end}`}
//               </div>
//               <Separator className="flex h-4 bg-muted-foreground/70 rounded-full ml-1" orientation="vertical" />
//               <div className="flex flex-row items-center gap-1">
//                 <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
//                 {work.location}
//               </div>
//             </div>
//           </ItemTitle>
//           <ItemDescription>
//             {work.title}
//             <Badge variant="outline" className="text-xs text-muted-foreground rounded-sm font-normal ml-2">
//               {work.workType}
//             </Badge>
//           </ItemDescription>
//         </ItemContent>
//       </Item>
//     </div>
//   )
// }



import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import Link from "next/link";
import { ArrowTopRightOnSquareIcon, CalendarIcon, CodeBracketIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { animate, AnimatePresence, motion } from "framer-motion";
import { useBoolean } from '@/hooks/use-boolean';
import { LinkPreview } from "../ui/link-preview";
import { WorkExperience } from "@/types/experience-types";
import { GlobeAltIcon } from "@heroicons/react/24/outline"

interface ExperienceTimelineItemProps {
  work: WorkExperience;
  index: number;
}

export function ExperienceTimelineItem({ work, index }: ExperienceTimelineItemProps) {

  const { value, setTrue, setFalse, toggle } = useBoolean(false);

  return (
    <div className={`group flex w-full flex-col ${!value && "hover:scale-[1.005]"} hover:ring-2 hover:ring-muted-foreground/5 dark:hover:ring-muted-foreground/10 rounded-lg hover:rounded-xl transition-all duration-300 cursor-pointer`} onClick={toggle} >
      <Item variant="outline" className="gap-0! group-hover:rounded-xl transition-all duration-300 overflow-hidden flex-col">
        <div className="sm:flex justify-start w-full">

          <ItemMedia className="flex h-full items-center translate-none! self-center!">
            {work.animatedLogo ? 
              <Avatar className="size-10 flex items-center justify-center overflow-visible">
                {work.animatedLogo}
              </Avatar> 
              : 
              <Avatar className="size-10 flex items-center justify-center">
                <AvatarImage key={work.logo} src={work.logo} />
                <AvatarFallback>{work.company.charAt(0)}</AvatarFallback>
              </Avatar>
            }
            <p className="sm:hidden font-medium">{work.company}</p>
          </ItemMedia>

          <ItemContent className="flex flex-col ml-2 sm:ml-4">
            <ItemTitle className="sm:flex sm:flex-row flex-col justify-between w-full">
              <div className="flex items-center gap-2">
                {/* <Link target="_blank" href={work.link} className="group/underline relative hover:text-primary transition-all duration-300">
                  {work.company}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px rounded-full bg-primary group-hover/underline:w-full transition-all duration-150" />
                </Link> */}
                <LinkPreview url={work.link} className="group/underline relative hover:text-primary transition-all duration-300 hidden sm:block">
                  {work.company}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px rounded-full bg-primary group-hover/underline:w-full transition-all duration-150" />
                </LinkPreview>
                <span className="text-muted-foreground font-light hidden sm:flex">-</span>
                <div className="hidden sm:flex flex-row text-muted-foreground items-center font-light">
                  {work.title}
                  <Badge variant="outline" className="text-xs text-muted-foreground rounded-sm font-normal ml-2">
                    {work.workType}
                  </Badge>
                </div>
                <div className="flex sm:hidden text-foreground items-center font-medium mt-1">
                  {work.title}
                  <Badge variant="outline" className="text-xs text-muted-foreground rounded-sm font-normal ml-2">
                    {work.workType}
                  </Badge>
                </div>
              </div>

              <div className="hidden sm:flex flex-row items-center gap-2 font-light text-sm">
                <div className="flex flex-row items-center gap-1">
                  <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
                  {work.start}{work.end && ` - ${work.end}`}
                </div>
                <Separator className="flex h-4 bg-muted-foreground/70 rounded-full ml-1" orientation="vertical" />
                <div className="flex flex-row items-center gap-1">
                  <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
                  {work.location}
                </div>
              </div>

              <div className={`flex ${work.end ? "flex-col justify-self-start w-full" : "flex-row"} sm:hidden items-center gap-2 font-light text-sm`}>
                <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                  <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
                  {work.start}{work.end && ` - ${work.end}`}
                </div>
                <Separator className={`${work.end ? "hidden" : "flex"} h-4 bg-muted-foreground/70 rounded-full ml-1`} orientation="vertical" />
                <div className="flex flex-row items-center gap-1 flex-nowrap">
                  <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
                  {work.location}
                </div>
              </div>
            </ItemTitle>
            <ItemDescription className="flex w-full mt-0.5 justify-center sm:justify-between items-center overflow-visible">
              <div className={`flex flex-row flex-wrap gap-x-1 ${work.liveWebsite ? "justfiy-start" : "justify-center"}`}>
                {work.badges.map((badge, idx) => (
                  <Badge key={badge} variant="outline" className={`text-xs text-primary rounded-sm font-normal border-none bg-primary/10 my-1 w-fit whitespace-nowrap sm:my-0`}>
                    {badge}
                  </Badge>
                ))}
              </div>
              {work.liveWebsite && (
                <LinkPreview url={work.link} className="transition-all duration-300 ml-auto cursor-pointer no-underline! overflow-visible">
                  <Button variant="ghost" className="text-muted-foreground hover:text-primary flex items-center gap-2 text-xs font-light rounded-sm hover:ring hover:ring-border px-2 h-5.5!">
                    Website
                    <GlobeAltIcon className="size-4" />
                  </Button>
                </LinkPreview>
              )}
            </ItemDescription>
          </ItemContent>
        </div>
        <AnimatePresence mode="wait">
            {value && (
              <>
                <motion.div 
                  initial={{width: 0, opacity: 0, marginTop: 0}}
                  animate={{width: "100%", opacity: 1, marginTop: 16}}
                  exit={{width: 0, opacity: 0, marginTop: 0}}
                  transition={{ duration: 0.5 }}
                  className="h-px w-full justify-self-start bg-border rounded-full" 
                />
                <motion.div 
                  initial={{ filter: "blur(2px)", opacity: 0, height: 0, marginTop: 0 }} 
                  animate={{ filter: "blur(0)", opacity: 1, height: "auto", marginTop: 16}} 
                  exit={{ filter: "blur(2px)", opacity: 0, height: 0, marginTop: 0 }} 
                  transition={{ filter: {duration: 0.2}, opacity: {duration: 0.2} }}
                >
                  {work.techBadges && work.techBadges?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* <Badge variant="outline" className="size-7 p-0 rounded-sm items-center justify-center"> */}
                        <CodeBracketIcon className="size-4 ml-2" />
                        <Separator orientation="vertical" className="w-px h-4 bg-muted-foreground/70" />
                      {/* </Badge> */}
                      {work.techBadges.map((item, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{opacity: 0, x: -3, y: -3, scale: 0.8}} 
                          animate={{opacity: 1, x: 0, y: 0, scale: 1}} 
                          transition={{
                            delay: 0.1 + (idx * 0.02),
                            duration: 0.3,
                            ease: "easeOut"
                          }}
                        >
                          <Badge variant="outline" className="text-muted-foreground rounded-sm whitespace-nowrap font-normal">
                            {item}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <motion.div 
                    initial={{y: -3, opacity: 0, marginTop: 0}} 
                    animate={{y: 0, opacity: 1, marginTop: work.techBadges ? 16 : 0, transition: { opacity: { delay: 0.2 }, y: { delay: 0.2 }}}} 
                    exit={{ marginTop: 0}}
                    className="text-justify"
                  >
                    {work.description}
                  </motion.div>
                  <motion.div
                    initial={{marginTop: 0}} 
                    animate={{marginTop: 16}}
                    exit={{ marginTop: 0}}
                    className="relative"
                  >
                    <ul className="flex flex-col list-outside list-disc z-0 gap-2">
                      {work.lineItems?.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{y: -3, x: -3, opacity: 0}} 
                          animate={{y: 0, x: 0, opacity: 1, transition: {delay: 0.2 + (idx * 0.1), duration: 0.3, ease: "easeOut"}}}
                          exit={{ marginTop: 0}}
                        >
                          <li className="mx-3 px-2 text-justify">
                            {item}
                          </li>
                        </motion.div>
                      ))}
                    </ul>
                  </motion.div>
                </motion.div>
              </>
            )}
        </AnimatePresence>
      </Item>
    </div>
  )
}