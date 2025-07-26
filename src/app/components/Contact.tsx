import React from "react";

const Contact = () => {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-semibold mb-4">Contact Me</h2>
        <ul className="flex justify-center space-x-6 mb-4">
          <li>
            <a
              href="/my-cv.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              📄 CV
            </a>
          </li>
          <li>
            <a
              href="mailto:hautrantrung.02@gmail.com"
              className="hover:underline"
            >
              📧 hautrantrung.02@gmail.com
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/hautrank2/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              💼 LinkedIn
            </a>
          </li>
          <li>
            <a
              href="https://github.com/hautrank2"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              🐙 GitHub
            </a>
          </li>
        </ul>
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Hau Tran Porfolio
        </p>
      </div>
    </div>
  );
};

export default Contact;
