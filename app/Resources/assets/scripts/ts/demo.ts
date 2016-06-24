/**
 * Typescript example.
 * Source: http://www.typescriptlang.org/play/
 */
class Greeter {
    greeting: string;
    constructor(message: string) {
        this.greeting = message;
    }
    greet() {
        return "Hello, " + this.greeting;
    }
}

let greeter = new Greeter("world");

let button = document.createElement('button');
button.textContent = "Say Hello (created from typescript)";
button.onclick = function() {
    alert(greeter.greet());
}

document.body.appendChild(button);
