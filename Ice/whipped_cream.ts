// RegEx used to detect charset in the get_encoding function
const charsetRegEx = /<meta.*charset=([^"\s]*)[^>]*>/

const countChar = (str: string, char: string) => str.split(char).length - 1;

async function get_encoding(html_file: File): Promise<string> {
    
    const stream: ReadableStream = html_file.stream();
    const reader: ReadableStreamDefaultReader = stream.getReader();
    const decoder: TextDecoder = new TextDecoder();

    let result: string = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) return "";

        result += decoder.decode(value, {stream: true});
        const match: RegExpMatchArray | null = result.match(charsetRegEx);
        if (match) return match[1];
        result = "<" + result.split("<")[-1];
    }
}

class WhippedCreamCan {
    ready: Boolean;
    weight: number;
    butterfat_content: number;
    butterfat_url: string;
    cream_urls: Array<string>;
    butterfat_list: Array<string>;
    whipped_cream_list: Array<string>;
    constructor(weight: number, butterfat_content: number, butterfat_url: string, cream_urls: Array<string>) {
        this.ready = false;
        this.weight = weight;
        this.butterfat_content = butterfat_content;
        this.butterfat_url = butterfat_url;
        this.cream_urls = cream_urls;
        this.butterfat_list = [];
        this.whipped_cream_list = [];
    }

    // The last of these three functions returns Zipf-Mandelbrot
    // randomly distributed words from the list of common words.
    // The first is a helper function to determine the count of
    // words returned; the second carries approximately finds a 
    // random value chosen per that distribution and returns the
    // word of that index
    r(): number {
        return Math.floor(this.weight / Math.random());
    }

    z(): string {
        let i: number = Math.floor(Math.exp(Math.random() * (Math.log(this.butterfat_list.length) + 0.5772) - 0.5772));
        return i < this.butterfat_list.length ? this.butterfat_list[i] : this.butterfat_list[0];
    }

    b(): string {
        return Array.from({length: this.r()}, () => { return this.z(); } ).join(" ");
    }

    // This function, given a count c and a URL u, retrieves
    // that many snippets from the text document at URL u
    async s(c: number, u: string): Promise<string[]> {
        const response = await fetch(u);
        if (!response.ok) return [];

        const valueBlob = await response.blob();
        const s = valueBlob.size;
        const m = this.r() * 5 + 5;

        const promises = Array.from({length: c}, async () => {
            const r = Math.floor(Math.random() * (s - m));
            const p = valueBlob.slice(r, r + m);
            const t = await p.text();
            return t.split(/\s/).slice(1, -1).join(" ");
        })

        return Promise.all(promises);
    }

    // This function calls the previous on all the URLs to produce
    // a list of snippets from various sources
    async sa(): Promise<string[]> {
        const l = 10000 - Math.floor(this.butterfat_content * 10);
        const breaks: Array<number> = [0].concat(Array.from({length: this.cream_urls.length - 1}, () => Math.floor(Math.random() * l)).sort().concat(l));
        console.log(breaks);
        const samples = await Promise.all(this.cream_urls.map(async (cream_url: string, index: number) => {
            return await this.s(breaks[index + 1] - breaks[index], cream_url);
        }));
        console.log(samples);
        return samples.flat();
    }

    async shake() {
        // Retrieve list of popular words if need to and haven't
        if (!this.butterfat_list.length && this.butterfat_content && this.butterfat_url) {
            const bf_response = await fetch(this.butterfat_url);
            if (bf_response.ok) {
                const bfc: string = await bf_response.text();
                this.butterfat_list = bfc.split(/\r?\n/);
            }
        }
        const samples = await this.sa();
        console.log(samples);

        this.whipped_cream_list = Array.from({length: Math.floor(this.butterfat_content * 10) }, () => { return this.b() }).concat(samples);
    }

    async uncap() {
        this.shake().then(() => {this.ready = true; console.log(this.butterfat_list, this.whipped_cream_list)});
    }

    get_css(): string {
        return ".a {\ndisplay:none\n}";
    }

    fssh(): string {
        return "<span class='a'>" + this.whipped_cream_list[Math.floor(Math.random() * this.whipped_cream_list.length)] + "</span>";
        // return "<span class='a'>" + "spam" + "</span>";
    }
}

////////////////////////////////////////
// Define objects in webpage
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const goButton = document.getElementById("goButton") as HTMLButtonElement;

let canister: WhippedCreamCan = new WhippedCreamCan(1, 200, "./src/google-10000-english.txt", ["./spam/pg37106.txt","./spam/pg75990.txt"]);
console.log(canister);
canister.uncap();

async function spray() {
if (!fileInput.files) return;
    const file: File | null = fileInput.files[0];
    if (!file) return;

    const fileName: string = file.name.split(".").slice(0, -1).join(".") + "_with_whipped_cream.htm";
    const fileEncoding: string = await get_encoding(file);
    console.log(`fileEncoding: ${fileEncoding}`);

    const stream: ReadableStream = file.stream();
    const reader: ReadableStreamDefaultReader = stream.getReader();
    const decoder: TextDecoder = new TextDecoder(fileEncoding);

    const total_content: Array<string> = [];
    let brackets: number = 0;
    let foundStyle: boolean = false;
    let foundEncoding: boolean = false;
    let foundBody: boolean = false;
    let result: string = ""

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        result += decoder.decode(value, {stream: true});
        const lines: Array<string> = result.split(/\r+\n/);

        lines.forEach(line => {
            console.log(`LINE: ${line}\n\n`);
            if (!foundStyle && (line.search("</style>") != -1)) {
                console.log("Found style!");
                foundStyle = true;
                let line_halves = line.split("</style>")
                line = line_halves[0] + canister.get_css() + "</style>" + line_halves.slice(1, line_halves.length).join("</style>");
            }
            if (!foundEncoding && (line.search(charsetRegEx) != -1)) line = line.replace(fileEncoding, "UTF-8");
            if (!foundBody) {
                const match: RegExpMatchArray | null = line.match(/<body[^>]*>/);
                if (match) {
                    foundBody = true;
                    let btag: string = match[0];
                    let line_halves = line.split(btag);
                    total_content.push(line_halves[0] + btag);
                    line = line_halves.slice(1, line_halves.length).join(btag);
                }
            }
            if (foundBody) {
                const words = line.trim().split(" ");
                console.log(words);
                const new_words: Array<string> = [];
                words.forEach( (val) => {
                    new_words.push(val);
                    if (val != "" && val.search(/\s/) == -1) {
                        brackets += countChar(val, "<");
                        console.log(`Brackets in ${val}: ${brackets}`);
                        if (brackets == 0) {
                            new_words.push(canister.fssh());
                        }
                        brackets -= countChar(val, '>');
                        console.log(`Brackets after ${val}: ${brackets}`);
                    }
                })
                console.log(new_words);
                total_content.push(new_words.join(" ") + "\n");
            } else total_content.push(line);
        });

        if (lines.length > 0) result = lines[-1];
    }

    const blob = new Blob(total_content, { type: "text/plain" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href); // Clean up the object URL
}

goButton.addEventListener('click', spray);