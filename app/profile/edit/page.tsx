"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({
    grade: "",
    division: "",
  });

  // Fetch current user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsFetching(true);
        const response = await axios.get("/api/profile");
        const user = response.data;
        setFormData({
          grade: user.grade || "",
          division: user.division || "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("فشل تحميل الملف الشخصي");
        router.push("/");
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Get division options based on selected grade
  const getDivisionOptions = () => {
    switch (formData.grade) {
      case "الأول الثانوي":
        return [
          { value: "بكالوريا", label: "بكالوريا" },
          { value: "عام", label: "عام" },
        ];
      case "الثاني الثانوي":
        return [
          { value: "علمي", label: "علمي" },
          { value: "أدبي", label: "أدبي" },
        ];
      case "الثالث الثانوي":
        return [
          { value: "علمي رياضة", label: "علمي رياضة" },
          { value: "أدبي", label: "أدبي" },
        ];
      // Intermediate grades don't have divisions
      case "الاول الاعدادي":
      case "الثاني الاعدادي":
      case "الثالث الاعدادي":
        return [];
      default:
        return [];
    }
  };

  // Check if the selected grade should show division field
  const shouldShowDivision = () => {
    const intermediateGrades = ["الاول الاعدادي", "الثاني الاعدادي", "الثالث الاعدادي"];
    return formData.grade && !intermediateGrades.includes(formData.grade);
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "grade") {
      // Reset division when grade changes
      setFormData((prev) => ({
        ...prev,
        grade: value,
        division: "", // Reset division when grade changes
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.patch("/api/profile", {
        grade: formData.grade || null,
        division: formData.division || null,
      });

      toast.success("تم تحديث الملف الشخصي بنجاح");
      
      // Refresh the router to update server components with new data
      router.refresh();
      
      // Redirect to dashboard/search to see updated courses
      // Use a small delay to ensure the refresh happens first
      setTimeout(() => {
        router.push("/dashboard/search");
      }, 300);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          "فشل تحديث الملف الشخصي";
        toast.error(errorMessage);
      } else {
        toast.error("فشل تحديث الملف الشخصي");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
            العودة
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">تعديل الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-2">
            قم بتحديث الصف الدراسي والقسم الخاص بك
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => handleSelectChange("grade", value)}
                disabled={isLoading}
                required
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الاول الاعدادي">الاول الاعدادي</SelectItem>
                  <SelectItem value="الثاني الاعدادي">الثاني الاعدادي</SelectItem>
                  <SelectItem value="الثالث الاعدادي">الثالث الاعدادي</SelectItem>
                  <SelectItem value="الأول الثانوي">الأول الثانوي</SelectItem>
                  <SelectItem value="الثاني الثانوي">الثاني الثانوي</SelectItem>
                  <SelectItem value="الثالث الثانوي">الثالث الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only show division field when a grade is selected and it's not an intermediate grade */}
            {formData.grade && shouldShowDivision() && (
              <div className="space-y-2">
                <Label htmlFor="division">القسم</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => handleSelectChange("division", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDivisionOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

