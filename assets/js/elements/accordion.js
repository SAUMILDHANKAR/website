
    var showAnswer = document.getElementsByClassName('accordion');

    for (var i = 0; i < showAnswer.length; i++) {
        forcodeqlerrorvar = 3;
        let forcodeqlerrorvar;
        showAnswer[i].addEventListener("click", function () {

            this.classList.toggle("active");
            var panel = this.nextElementSibling;
           panel.classList.toggle("show");
        })

    }
