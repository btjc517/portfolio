"use client";

// Footer component for ImpactOS landing pages
// Renders social links, contact resources, and legal navigation items
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Cookie, FileDown, Gavel, Handshake, MailIcon, Scale } from 'lucide-react';
import { BriefcaseIcon, ScaleIcon } from '@heroicons/react/24/outline';
// import { ImpactOSLogo } from '../../app/impactos-logo';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { RESUME_DATA } from '@/data/resume-data';
import { ThemeSwitcher } from './theme-switcher';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
// import { createClient } from '@/lib/supabase/client';

type FooterProps = React.ComponentProps<'footer'> & {
	children: React.ReactNode;
};

/**
 * Displays the ImpactOS marketing footer with social actions and grouped links.
 * @param className - Optional classes applied to the root footer element.
 * @param props - Remaining footer props forwarded to the native footer tag.
 */
export function Footer({ className, ...props }: Omit<FooterProps, 'children'>) {
    // Router for client-side navigation
    const router = useRouter();

    /**
     * Handles login CTA click by checking Supabase session.
     * - If user is authenticated: show welcome toast and route to dashboard.
     * - If unauthenticated: route to login page.
     */
    // const handleLoginClick: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
    //     // Prevent default anchor navigation until we decide the route
    //     e.preventDefault();
    //     const supabase = createClient();
    //     const { data: { user } } = await supabase.auth.getUser();
    //     if (user) {
    //         const displayName = (user.user_metadata?.full_name as string | undefined) || user.email || '';
    //         toast.success(`Welcome back${displayName ? ', ' + displayName : ''}!`);
    //         router.push('/protected/dashboard/overview');
    //         return;
    //     }
    //     router.push('/auth/login');
    // };

    return (
		// <footer
		// 	className={cn(
		// 		'w-full border-t ',
		// 		className,
		// 	)}
		// 	{...props}
		// >
		// 	<div className="relative mx-auto max-w-6xl">
        // {/* <div className="flex w-full justify-between items-center gap-2 border-b border-x border-border">
        //   <div className="flex w-full items-center justify-center gap-2 p-4">
        //     <ImpactOSLogo
        //       className="text-foreground size-7 md:size-9 overflow-visible drop-shadow-[0_0_10px_rgba(54,143,255,1)] dark:drop-shadow-[0_0_5px_rgba(54,143,255,1)]  [--impactos-pulse-color:#368FFF] dark:[--impactos-pulse-color:#368FFF]"
        //     />
        //     <span className="flex items-center text-[10px] uppercase tracking-[0.6em] text-foreground/80 font-extrabold">
        //       Impact<span className="font-semibold">OS</span>
        //     </span>
        //   </div>
        // </div> */}
		// 		<div className="relative border-x">
		// 			<p>Get in touch</p>
        //             <Button>
        //                 Email
        //             </Button>
        //             <Button>
        //                 Github
        //             </Button>
        //             <Button>
        //                 Email
        //             </Button>
        //             <Button>
        //                 Email
        //             </Button>
		// 		</div>
		// 	</div>
		// 	<div className="flex justify-center border-t border-x p-3">
		// 		<p className="text-muted-foreground text-xs">
		// 			© {new Date().getFullYear()} ImpactOS. All rights reserved.
		// 		</p>
		// 	</div>
		// </footer>
        <footer className='w-full border-t'>
            <div className="w-full max-w-6xl mx-auto border-x bg-background">
                <div className="flex flex-col items-center max-w-5xl mx-auto py-8">

                    <p className="uppercase text-[14px] font-normal text-primary">Fancy a chat?</p>
                    <p className="text-charcoal-700 text-center text-2xl font-medium tracking-tight md:text-3xl lg:text-4xl dark:text-neutral-100 mt-4">Get In Touch</p>

                </div>

                <div className='h-px w-full bg-border' />

                <div className="flex flex-col md:flex-row justify-between items-stretch w-full max-w-5xl mx-auto py-8 px-4 xl:px-0">
                    <div className='flex flex-col'>
                        <h1 className="text-2xl font-medium">{RESUME_DATA.name}</h1>
                        <p className="max-w-md text-sm text-muted-foreground mt-0.5">
                            {RESUME_DATA.about}
                        </p>
                    </div>
                    <div className="flex gap-y-1 gap-x-1 pt-4 text-sm text-muted-foreground">
                        <div className='flex gap-x-1'>
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
                        </div>
                        <Button
                        variant="outline"
                        className="flex h-8 items-center gap-2 px-2! ml-2 md:ml-0"
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
            <div className="flex justify-center border-t border-x p-3">
				<p className="text-muted-foreground text-xs">
					© {new Date().getFullYear()} Ben Cheesebrough. All rights reserved.
				</p>
			</div>
        </footer>
	);
}

interface LinksGroupProps {
	title: string;
	links: { title: string; href: string; icon?: React.ReactNode; disabled?: boolean }[];
}
/**
 * Renders a titled list of navigational links within the footer layout.
 * @param title - Section heading for the link group.
 * @param links - Collection of navigational link metadata including URL and label.
 */
function LinksGroup({ title, links }: LinksGroupProps) {
	return (
		<div className="p-2">
			<h3 className="text-foreground/75 mt-2 mb-4 text-xs font-medium tracking-wider uppercase">
				{title}
			</h3>
			<ul>
				{links.map((link) => (
					<li key={link.title} className={`${link.disabled ? 'cursor-default pointer-events-none opacity-50' : ''}`}>
						<a
							href={link.href}
							className="text-muted-foreground hover:text-foreground text-xs flex items-center justify-start gap-1 py-0.5"
						>
							{link.icon}
							{link.title}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * Provides a call-to-action card linking to a primary social or contact resource.
 * @param title - Label displayed on the social card.
 * @param href - Destination URL for the card link.
 * @param className - Optional classes appended to the anchor.
 */
function SocialCard({ title, href, className, disabled, onClick }: { title: string; href: string; className?: string; disabled?: boolean; onClick?: React.MouseEventHandler<HTMLAnchorElement> }) {
	return (
		<a
			href={href}
            onClick={onClick}
			className={cn("hover:bg-accent hover:text-accent-foreground flex items-center justify-between border-t border-b p-2 text-sm md:border-t-0", disabled ? 'cursor-default pointer-events-none opacity-50' : '', className)}
		>
			<span className="font-medium">{title}</span>
			<ArrowRight className="h-4 w-4 transition-colors" />
		</a>
	);
}
