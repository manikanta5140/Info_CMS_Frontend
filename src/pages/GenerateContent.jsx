import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../Components/common/Button";
import Input from "../Components/common/Input";
import "@toast-ui/editor/dist/toastui-editor.css";
import { Editor } from "@toast-ui/react-editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faSpinner,
  faCloudArrowUp,
  faBackward,
} from "@fortawesome/free-solid-svg-icons";
import { chatSession } from "../utils/AiModel";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  getContentById,
  getContentBySlug,
  storeContentHistory,
  updateContentHistory,
} from "../Api/services/contentService/contentService";
import { useAuth } from "../Context/AuthContext";
import { showNotification } from "../Components/notification/Notification";
import ModalButton from "../Components/Modals/ModalButton";

const GenerateContent = ({ mode }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [isCopied, setIsCopied] = useState();
  const [content, setContent] = useState();
  const [selectedTemplte, setSelectedTemplate] = useState();
  const [editData, setEditData] = useState();
  const editorRef = useRef();

  const params = useParams();
  const navigate = useNavigate();
  const { slug, id } = params;

  useEffect(() => {
    getContentBySlug(slug)
      .then((res) => {
        setContent(res);
        console.log(res, "byslug");
      })
      .catch((err) => {
        console.log(err);
      });
  }, [slug]);

  useEffect(() => {
    const updateData = async () => {
      try {
        if (content && mode) {
          if (mode === "edit" && id) {
            const res = await getContentById(id);
            const { slug, content: editorContent, ...rest } = res;
            const formDetails = await getContentBySlug(slug);
            setEditData(res);
            setSelectedTemplate(formDetails[0]);

            const editorInstance = editorRef.current.getInstance();
            editorInstance.setMarkdown(editorContent || "");
          } else if (mode === "generate" && slug) {
            const selectedTemplate = content.find((item) => item.slug === slug);
            setSelectedTemplate(selectedTemplate);
          }
        }
      } catch (err) {
        console.error("Error updating data:", err);
      }
    };

    updateData();
  }, [content, mode, slug, id]);

  useEffect(() => {
    const editorInstance = editorRef.current.getInstance();
    editorInstance.setMarkdown(aiResult);
  }, [aiResult]);

  useEffect(() => {
    if (aiResult) {
      const contentData = {
        categoryId: selectedTemplte?.id,
        prompt: selectedTemplte?.aiPrompt,
        content: aiResult,
        slug: slug,
        inputLable1Text: formData[selectedTemplte?.formName1],
        inputLabel2Text: formData[selectedTemplte?.formName2],
      };
      storeContentHistory(contentData);
    }
  }, [aiResult]);

  const onCopyHandler = (text, result) => {
    if (result) {
      setIsCopied(true);
      showNotification("Content copied to clipboard!", "success");

      setTimeout(() => setIsCopied(false), 1500);
    } else {
      showNotification("Failed to copy text. Please try again.", "error");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    generateAiContent(formData);
  };

  const generateAiContent = async (formData) => {
    setLoading(true);
    const selectedPrompt = selectedTemplte?.aiPrompt;
    const finalAiPrompt = JSON.stringify(formData) + " , " + selectedPrompt;
    const result = await chatSession.sendMessage(finalAiPrompt);
    setAiResult(result?.response.text());
    setLoading(false);
  };

  const handleSave = async () => {
    const editorInstance = editorRef.current.getInstance();
    const updatedContent = editorInstance.getMarkdown();
    const updatedData = {
      content: updatedContent,
    };

    try {
      await updateContentHistory(id, updatedData);
      navigate(-1);
    } catch (error) {
      console.error("Error updating content:", error);
    }
  };

  return (
    <>
      {/* {isCopied && (
        <div
          className="fixed top-0 left-0 right-0 bg-green-600 text-white text-center py-2 z-50"
          style={{ transition: "opacity 0.5s ease-in-out" }}
        >
          Content copied to clipboard!
        </div>
      )} */}

      <div className="sm:p-6 md:py-12  md:px-2 my-auto">
        <section className="max-w-screen-lg md:rounded-md ">
          <Button
            type="button"
            className="bg-secondary text-primary font-medium flex gap-2 justify-center items-center mb-3 md:ml-8  lg:ml-0 mt-10 md:mt-0"
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faBackward} /> Back
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-secondary">
            {/* <!-- Form section --> */}
            <div className="lg:col-span-1 flex justify-center">
              <div className="max-w-sm bg-primary xl:max-w-md p-4 md:p-6 shadow-md sm:px-8 sm:py-10 rounded-lg">
                <img
                  src={selectedTemplte?.iconUrl}
                  alt="icon"
                  className="w-12 h-12 mb-3 p-1 rounded bg-white"
                />
                <h2 className="font-semibold text-xl md:text-2xl mb-2 text-purple-700">
                  {selectedTemplte?.categoryName}
                </h2>
                <blockquote className="mt-4">
                  <p className="leading-relaxed text-sm md:text-base">
                    {selectedTemplte?.description}
                  </p>
                </blockquote>
                <form className="mt-4" onSubmit={onSubmit}>
                  {selectedTemplte && (
                    <div className="my-2 flex flex-col gap-2 mb-5 md:mb-6">
                      {selectedTemplte?.formField1 && (
                        <div>
                          <label
                            htmlFor={selectedTemplte?.id}
                            className="block mb-1 font-medium md:font-bold"
                          ></label>

                          <Input
                            name={selectedTemplte?.formName1}
                            required={selectedTemplte?.formRequired1}
                            onChange={handleChange}
                            value={
                              mode === "edit"
                                ? editData?.inputLable1Text || ""
                                : formData[selectedTemplte?.formName1] || ""
                            }
                            placeholder={
                              selectedTemplte?.placeholder ||
                              `Enter ${selectedTemplte?.formLabel1}`
                            }
                            className="text-primary placeholder:text-primary w-full px-3 py-2 border rounded-md text-sm md:text-base focus:outline-none focus:ring focus:border-[var(--color-important)]"
                          />
                        </div>
                      )}

                      {selectedTemplte?.formField2 && (
                        <div className="mt-4">
                          <label
                            htmlFor={selectedTemplte?.id}
                            className="text-secondary block mb-1 font-medium md:font-bold"
                          >
                            {selectedTemplte?.formLabel2}
                          </label>

                          <textarea
                            name={selectedTemplte?.formName2}
                            required={selectedTemplte?.formRequired2}
                            value={
                              mode === "edit"
                                ? editData?.inputLable2Text || ""
                                : formData[selectedTemplte?.formName2] || ""
                            }
                            onChange={handleChange}
                            placeholder={
                              selectedTemplte?.placeholder ||
                              `Enter ${selectedTemplte?.formLabel1}`
                            }
                            className="bg-primary text-primary w-full px-3 py-2 border rounded-md text-sm md:text-base focus:outline-none focus:ring focus:border-[var(--color-important)]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="text-primary font-semibold bg-button text-sm md:text-base flex gap-2 items-center justify-center"
                    disabled={loading}
                  >
                    {loading && (
                      <FontAwesomeIcon
                        className="animate-spin"
                        icon={faSpinner}
                      />
                    )}
                    Generate
                  </Button>
                </form>
              </div>
            </div>
            {/* <!-- Editor section --> */}
            <div className="lg:col-span-2 flex flex-col justify-between">
              <div className="bg-primary shadow-lg  rounded-lg p-4 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-primary font-semibold text-base md:text-lg">
                    Your Result
                  </h2>
                  <div className="flex gap-2">
                    <CopyToClipboard text={aiResult} onCopy={onCopyHandler}>
                      <Button
                        className={` text-blue-900 bg-blue-200 flex items-center gap-2 font-semibold text-xs md:text-sm hover:bg-blue-300 ${
                          isCopied ? "bg-green-600 text-white" : ""
                        }`}
                      >
                        <FontAwesomeIcon icon={faCopy} /> Copy
                      </Button>
                    </CopyToClipboard>
                  </div>
                </div>
                <Editor
                  ref={editorRef}
                  initialValue="Your result will be here"
                  initialEditType="wysiwyg"
                  height="450px"
                  useCommandShortcut={true}
                />
                {mode === "edit" && (
                  <div className="flex flex-row-reverse mt-3">
                    <Button
                      className=" text-sm md:text-base"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default GenerateContent;
