"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

interface Course {
    id: string;
    title: string;
}

interface Chapter {
    id: string;
    title: string;
    courseId: string;
}

interface LiveSession {
    id: string;
    title: string;
    description?: string | null;
    linkUrl: string;
    linkType: string;
    startDate: string;
    endDate?: string | null;
    isFree: boolean;
    courses: Array<{
        courseId: string;
    }>;
    chapterId?: string | null;
}

const EditLivestreamPage = () => {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        linkType: "",
        linkUrl: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        isFree: false,
        courseIds: [] as string[],
        chapterId: "",
    });

    useEffect(() => {
        fetchCourses();
        fetchSession();
    }, [sessionId]);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/teacher/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/livestream/${sessionId}`);
            if (response.ok) {
                const session: LiveSession = await response.json();
                
                const startDate = new Date(session.startDate);
                const endDate = session.endDate ? new Date(session.endDate) : null;

                setFormData({
                    title: session.title,
                    description: session.description || "",
                    linkType: session.linkType,
                    linkUrl: session.linkUrl,
                    startDate: startDate.toISOString().split("T")[0],
                    startTime: startDate.toTimeString().slice(0, 5),
                    endDate: endDate ? endDate.toISOString().split("T")[0] : "",
                    endTime: endDate ? endDate.toTimeString().slice(0, 5) : "",
                    isFree: session.isFree,
                    courseIds: session.courses.map((c) => c.courseId),
                    chapterId: session.chapterId || "",
                });

                // Fetch chapters for selected courses
                if (session.courses.length > 0) {
                    fetchChapters(session.courses.map((c) => c.courseId));
                }
            } else {
                toast.error("حدث خطأ في تحميل الجلسة");
                router.push("/dashboard/teacher/livestream");
            }
        } catch (error) {
            console.error("Error fetching session:", error);
            toast.error("حدث خطأ في تحميل الجلسة");
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async (courseIds: string[]) => {
        if (courseIds.length === 0) {
            setChapters([]);
            return;
        }

        try {
            const allChapters: Chapter[] = [];
            for (const courseId of courseIds) {
                const response = await fetch(`/api/courses/${courseId}/chapters`);
                if (response.ok) {
                    const data = await response.json();
                    allChapters.push(...(data.chapters || []));
                }
            }
            setChapters(allChapters);
        } catch (error) {
            console.error("Error fetching chapters:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (!formData.title || !formData.linkUrl || !formData.linkType || !formData.startDate || formData.courseIds.length === 0) {
            toast.error("يرجى ملء جميع الحقول المطلوبة");
            setSaving(false);
            return;
        }

        try {
            const startDateTime = `${formData.startDate}T${formData.startTime || "00:00"}`;
            const endDateTime = formData.endDate ? `${formData.endDate}T${formData.endTime || "23:59"}` : null;

            const response = await fetch(`/api/livestream/${sessionId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description || null,
                    linkUrl: formData.linkUrl,
                    linkType: formData.linkType,
                    startDate: startDateTime,
                    endDate: endDateTime,
                    isFree: formData.isFree,
                    courseIds: formData.courseIds,
                    chapterId: formData.chapterId || null,
                }),
            });

            if (response.ok) {
                toast.success("تم تحديث الجلسة بنجاح");
                router.push("/dashboard/teacher/livestream");
            } else {
                const error = await response.text();
                toast.error(error || "حدث خطأ أثناء تحديث الجلسة");
            }
        } catch (error) {
            console.error("Error updating livestream:", error);
            toast.error("حدث خطأ أثناء تحديث الجلسة");
        } finally {
            setSaving(false);
        }
    };

    const handleCourseToggle = (courseId: string) => {
        const newCourseIds = formData.courseIds.includes(courseId)
            ? formData.courseIds.filter((id) => id !== courseId)
            : [...formData.courseIds, courseId];

        setFormData({ ...formData, courseIds: newCourseIds, chapterId: "" });
        fetchChapters(newCourseIds);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>تعديل جلسة البث المباشر</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">العنوان *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="عنوان الجلسة"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف الجلسة (اختياري)"
                                rows={4}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="linkType">نوع الرابط *</Label>
                                <Select
                                    value={formData.linkType}
                                    onValueChange={(value) => setFormData({ ...formData, linkType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر نوع الرابط" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ZOOM">Zoom</SelectItem>
                                        <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="linkUrl">رابط البث المباشر *</Label>
                                <Input
                                    id="linkUrl"
                                    type="url"
                                    value={formData.linkUrl}
                                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                    placeholder="https://..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">تاريخ البدء *</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="startTime">وقت البدء</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="endDate">تاريخ الانتهاء (اختياري)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endTime">وقت الانتهاء</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>الكورسات *</Label>
                            <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                                {courses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">لا توجد كورسات متاحة</p>
                                ) : (
                                    courses.map((course) => (
                                        <div key={course.id} className="flex items-center space-x-2 space-x-reverse">
                                            <Checkbox
                                                id={`course-${course.id}`}
                                                checked={formData.courseIds.includes(course.id)}
                                                onCheckedChange={() => handleCourseToggle(course.id)}
                                            />
                                            <label
                                                htmlFor={`course-${course.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {course.title}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            {formData.courseIds.length === 0 && (
                                <p className="text-sm text-red-500">يجب اختيار كورس واحد على الأقل</p>
                            )}
                        </div>

                        {chapters.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="chapterId">الفصل (اختياري)</Label>
                                <Select
                                    value={formData.chapterId}
                                    onValueChange={(value) => setFormData({ ...formData, chapterId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر الفصل" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">لا يوجد</SelectItem>
                                        {chapters.map((chapter) => (
                                            <SelectItem key={chapter.id} value={chapter.id}>
                                                {chapter.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                                id="isFree"
                                checked={formData.isFree}
                                onCheckedChange={(checked) => setFormData({ ...formData, isFree: !!checked })}
                            />
                            <label
                                htmlFor="isFree"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                جلسة مجانية
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={saving}
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#0083d3] hover:bg-[#0083d3]/90"
                                disabled={saving}
                            >
                                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                                <ArrowRight className="mr-2 h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default EditLivestreamPage;

