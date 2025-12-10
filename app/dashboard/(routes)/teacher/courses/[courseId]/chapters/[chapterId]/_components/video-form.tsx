"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Video, Pencil, Upload, Youtube, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";

interface VideoFormProps {
    initialData: {
        videoUrl: string | null;
        videoType: string | null;
        youtubeVideoId: string | null;
    };
    courseId: string;
    chapterId: string;
}

export const VideoForm = ({
    initialData,
    courseId,
    chapterId
}: VideoFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Local state to track video data (updated immediately after adding)
    const [videoData, setVideoData] = useState(initialData);
    const router = useRouter();

    // Update local state when initialData changes
    useEffect(() => {
        setVideoData(initialData);
    }, [initialData]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onSubmitUpload = async (url: string) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                throw new Error('Failed to upload video');
            }

            const responseData = await response.json();
            // Update local state immediately with the new video data
            setVideoData({
                videoUrl: responseData.url || url,
                videoType: "UPLOAD",
                youtubeVideoId: null
            });
            toast.success("تم رفع الفيديو بنجاح");
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_VIDEO]", error);
            toast.error("حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    }

    const onSubmitYouTube = async () => {
        if (!youtubeUrl.trim()) {
            toast.error("يرجى إدخال رابط YouTube");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ youtubeUrl }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to add YouTube video');
            }

            const responseData = await response.json();
            // Update local state immediately with the new video data
            setVideoData({
                videoUrl: responseData.url || youtubeUrl,
                videoType: "YOUTUBE",
                youtubeVideoId: responseData.youtubeVideoId || null
            });
            toast.success("تم إضافة فيديو YouTube بنجاح");
            setIsEditing(false);
            setYoutubeUrl("");
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_YOUTUBE]", error);
            toast.error(error instanceof Error ? error.message : "حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Create a stable key for the video player
    const videoPlayerKey = useMemo(() => {
        if (videoData.videoType === "YOUTUBE" && videoData.youtubeVideoId) {
            return `youtube-${chapterId}-${videoData.youtubeVideoId}`;
        }
        if (videoData.videoUrl) {
            return `upload-${chapterId}-${videoData.videoUrl}`;
        }
        return null;
    }, [chapterId, videoData.videoType, videoData.youtubeVideoId, videoData.videoUrl]);

    // Check if video exists
    const hasVideo = videoData.videoUrl || (videoData.videoType === "YOUTUBE" && videoData.youtubeVideoId);

    if (!isMounted) {
        return null;
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                فيديو الفصل
                <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل الفيديو
                        </>
                    )}
                </Button>
            </div>
            
            {!isEditing && (
                <div className="relative aspect-video mt-2">
                    {hasVideo && videoPlayerKey ? (
                        <PlyrVideoPlayer
                            key={videoPlayerKey}
                            videoUrl={videoData.videoType === "UPLOAD" ? videoData.videoUrl : undefined}
                            youtubeVideoId={videoData.videoType === "YOUTUBE" ? videoData.youtubeVideoId || undefined : undefined}
                            videoType={(videoData.videoType as "UPLOAD" | "YOUTUBE") || "UPLOAD"}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted rounded-md">
                            <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
            )}
            
            {isEditing && (
                <div className="mt-4">
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                رفع فيديو
                            </TabsTrigger>
                            <TabsTrigger value="youtube" className="flex items-center gap-2">
                                <Youtube className="h-4 w-4" />
                                رابط YouTube
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="upload" className="mt-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    ارفع فيديو من جهازك
                                </div>
                                <FileUpload
                                    endpoint="chapterVideo"
                                    onChange={(res) => {
                                        if (res?.url) {
                                            onSubmitUpload(res.url);
                                        }
                                    }}
                                />
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="youtube" className="mt-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    الصق رابط فيديو YouTube
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube-url">رابط YouTube</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="youtube-url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button 
                                            onClick={onSubmitYouTube}
                                            disabled={isSubmitting || !youtubeUrl.trim()}
                                            className="flex items-center gap-2"
                                        >
                                            <Link className="h-4 w-4" />
                                            إضافة
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    يدعم الروابط التالية:
                                    <br />
                                    • https://www.youtube.com/watch?v=VIDEO_ID
                                    <br />
                                    • https://youtu.be/VIDEO_ID
                                    <br />
                                    • https://www.youtube.com/embed/VIDEO_ID
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    )
} 