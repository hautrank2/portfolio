const elements = document.querySelectorAll("section");
const observer = new IntersectionObserver((entries) => {
  const classArr = "opacity-100 transition duration-700";
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add(...classArr.split(" "));
      observer.unobserve(entry.target);
    }
  });
});
elements.forEach((el) => observer.observe(el));
