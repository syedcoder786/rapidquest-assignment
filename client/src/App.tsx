import { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { url } from "./config/default";

function App() {
  interface EditorContent {
    id: number;
    html: string;
  }
  const [editorContent, setEditorContent] = useState<EditorContent[]>([]);

  const [editorValue, setEditorValue] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    // Fetch the email layout data from the backend
    const fetchEmailLayout = async () => {
      try {
        setLoading(true); // Set loading to true before the API call
        const response = await fetch(`${url}/getEmailLayout`);
        if (!response.ok) {
          throw new Error("Failed to fetch email layout");
        }
        const data: EditorContent[] = await response.json();
        setEditorContent(data); // Update editor content with fetched data
      } catch (error) {
        console.error("Error fetching email layout:", error);
      } finally {
        setLoading(false); // Set loading to false after the API call completes
      }
    };

    fetchEmailLayout();
  }, []);

  const handleSaveTemplate = async () => {
    try {
      const response = await fetch(`${url}/uploadEmailConfig`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editorContent),
      });

      await response.json();

      if (response.ok) {
        toast.success("Template saved successfully!");
      } else {
        console.log("error");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("An error occurred while saving the template.");
    }
  };

  const handleChange = (value: string) => {
    console.log(value);
    setEditorValue(value);
    if (editingId !== null) {
      setEditorContent((prevContent) => {
        return prevContent.map((item) =>
          item.id === editingId ? { ...item, html: value } : item
        );
      });
    } else {
      setEditorContent([
        ...editorContent,
        {
          id: Math.max(...editorContent.map((section) => section.id)) + 1,
          html: value,
        },
      ]);
      setEditingId(Math.max(...editorContent.map((section) => section.id)) + 1);
    }
  };

  const handleDownloadTemplate = async () => {
    const htmlContent = editorContent.map((item) => item.html).join("<br/>");

    const config = { html: htmlContent };

    try {
      const response = await fetch(`${url}/renderAndDownloadTemplate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "rendered-template.html";
        link.click();

        window.URL.revokeObjectURL(url);

        console.log("Template rendered and downloaded successfully");
      } else {
        const result = await response.text();
        console.error("Error rendering template:", result);
      }
    } catch (error) {
      console.error("Error calling API:", error);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      console.log("Selected file:", file);

      const formData = new FormData();
      formData.append("file", file);
      toast.warning(`Uploading file... Please wait`);

      try {
        const response = await fetch(`${url}/uploadImage`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          console.log("Image uploaded successfully:", result.imageUrl);
          insertImageToEditor(result.imageUrl);
        } else {
          console.error("Image upload failed:", result.message);
        }
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    };
  };

  const insertImageToEditor = (url: string) => {
    setTimeout(() => {
      setEditorValue(
        (prev) => `${prev}<img src="${url}" alt="Uploaded Image" />`
      );
      toast.success(`Image uploaded successfully`);
    }, 100);
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["bold", "italic", "underline", "strike"],
          [{ size: ["small", false, "large", "huge"] }],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    []
  );

  const handleFocus = (id: number) => {
    const section = editorContent.find((item) => item.id === id);
    if (section) {
      setEditingId(id);
      setTimeout(() => {
        setEditorValue(section.html);
      }, 100);
    }
  };

  const handleMenuAction = (action: string, id: number) => {
    switch (action) {
      case "delete":
        setEditorContent((prevContent) =>
          prevContent.filter((item) => item.id !== id)
        );
        setEditingId(null);
        break;
      case "moveUp":
        setEditorContent((prevContent) => {
          const index = prevContent.findIndex((item) => item.id === id);
          if (index > 0) {
            const newContent = [...prevContent];
            const [itemToMove] = newContent.splice(index, 1);
            newContent.splice(index - 1, 0, itemToMove);
            return newContent;
          }
          return prevContent;
        });
        break;
      case "moveDown":
        setEditorContent((prevContent) => {
          const index = prevContent.findIndex((item) => item.id === id);
          if (index < prevContent.length - 1) {
            const newContent = [...prevContent];
            const [itemToMove] = newContent.splice(index, 1);
            newContent.splice(index + 1, 0, itemToMove);
            return newContent;
          }
          return prevContent;
        });
        break;
      case "addBelow":
        setEditorContent((prevContent) => {
          const index = prevContent.findIndex((item) => item.id === id);
          const newId = Math.max(...prevContent.map((item) => item.id)) + 1;
          const newContent = [...prevContent];
          newContent.splice(index + 1, 0, { id: newId, html: "" });
          setEditingId(newId);
          setTimeout(() => {
            setEditorValue("");
          }, 100);
          return newContent;
        });
        break;
      default:
        break;
    }
  };

  const sectionRefs = useRef<Record<number, HTMLDivElement>>({});
  const quillDivRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside =
        !Object.values(sectionRefs.current).some((ref) =>
          ref?.contains(event.target as Node)
        ) &&
        !quillDivRef.current?.contains(event.target as Node) &&
        !contentRef.current?.contains(event.target as Node);

      if (clickedOutside) {
        setEditingId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex w-full p-10">
      <div
        className="display w-3/4 h-fit px-10 py-4 border mx-2"
        ref={contentRef}
      >
        {loading ? (
          <div className="text-center">
            Loading Template... Please Wait this may take few moments
          </div>
        ) : (
          editorContent?.map((section) => (
            <div key={section.id} className="relative">
              <div
                onClick={() => handleFocus(section.id)}
                className={`${
                  editingId &&
                  editingId === section.id &&
                  "border border-yellow-300"
                } p-4 rounded-md cursor-pointer`}
              >
                <p dangerouslySetInnerHTML={{ __html: section.html }} />
              </div>
              {editingId && editingId === section.id && (
                <div className="bg-yellow-300 absolute flex gap-4 -bottom-8 right-2 rounded-md shadow-md p-2 z-10">
                  <button
                    onClick={() => handleMenuAction("addBelow", section.id)}
                    className="block text-sm text-blue-500"
                  >
                    Add +
                  </button>
                  <button
                    onClick={() => handleMenuAction("moveUp", section.id)}
                    className="block text-sm text-blue-500"
                  >
                    Move Up
                  </button>
                  <button
                    onClick={() => handleMenuAction("moveDown", section.id)}
                    className="block text-sm text-blue-500"
                  >
                    Move Down
                  </button>
                  {editorContent.length > 1 && (
                    <button
                      onClick={() => handleMenuAction("delete", section.id)}
                      className="block text-sm text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="kit w-1/4 h-fit" ref={quillDivRef}>
        {editingId ? (
          <div className="">
            <ReactQuill
              ref={quillRef}
              value={editorValue}
              onChange={handleChange}
              modules={modules}
              theme="snow"
              placeholder="Write something..."
            />
          </div>
        ) : (
          <p className="border rounded p-2 flex items-center">
            Click on the object you want to edit
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="my-4 w-1/2 bg-blue-500 text-white font-bold py-2 rounded-md"
          >
            Download Template
          </button>
          <button
            onClick={handleSaveTemplate}
            className="my-4 w-1/2 bg-green-500 text-white font-bold py-2 rounded-md"
          >
            Save Template
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
