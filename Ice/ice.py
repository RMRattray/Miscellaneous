import sys 
import os
import random
import math as maths
import re

#########################################################
# SECTION I. Sampling from PD texts
#########################################################

# This function reads and returns *c* random samples of approximately *m* words
# from the file named *fn*, assuming it is encoded in Unicode utf-8
def sample(fn, c, m=1):
    m = m*5 + 5
    with open(fn, "r", encoding="utf-8") as f:
        s = [""]
        l = f.seek(0, 2) # Maximum offset
        while (c):
            f.seek(int(random.random() * l))
            try:
                s.append(" ".join(f.read(m).split(" ")[1:-1]))
            except:
                continue
            c -= 1
        return s

# This function reads and returns *c* random samples of approximately *m* words
# from the given spam files
def sample_all(c, m):
    filelist = os.listdir("spam")
    ind = len(filelist) - 1
    breaks = [int(random.random() * c) for _ in range(ind)]
    breaks.sort()
    s = sample("spam/" + filelist[ind], c - breaks[ind - 1], m)
    while(ind > 1):
        ind -= 1
        s += sample("spam/" + filelist[ind], breaks[ind] - breaks[ind - 1], m)
    s += sample("spam/" + filelist[0], breaks[0], m)
    return s 

#####################################################################
# SECTION II. Sampling from the Zipf-Mandelbrot distribution
#####################################################################

# This function gives the number of words in a random sample            
def r(m=1):
    return int(m/random.random())

# This function, given a list *entities* of length *l*, gives each
# one a probability of selection in rough accordance with the harmonic series
def z(entities, l):
    if (l == 0):
        l = len(entities)
    i = int(maths.exp(random.random() * (maths.log(l) + 0.5772) - 0.5772))
    return entities[i] if i < l else entities[0]

# This function produces a sample of random words given a list of them
# in order from most to least frequent, using the functions above
# *m* denotes the average length of the sample
def r_j(w, l, m):
    return " ".join(map(lambda _ : z(w, l), ([""] * r(m))))

# This function retrieves a list of words from a text file
# where each word is on a new line
def w_g(fname="common_words.txt"):
    with open(fname, "r") as f:
        w = f.readlines()
        return list(map(lambda x: x[:-1], w)), len(w)

####################################################################
# SECTION III. Icing text
####################################################################

# This function removes HTML tags from text
def clean(text):
    return re.sub(r"<[^<>]*>", " ", text)

# This function returns a random span tag
def get_span_class(real=False):
    return random.choice(['c','n','s','t']) if real else random.choice(['a','e','i','o'])

# This object makes and holds junk
class JunkSource:
    def __init__(self, m, p=0, cwordfile="common_words.txt"):
        self.p = p 
        self.m = m
        self.w, self.l = w_g(cwordfile)
        self.update_junkpile()
        self.i = 0

    def update_junkpile(self):
        self.junkpile = [r_j(self.w, self.l, self.m) for _ in range(self.p)] + sample_all(1000 - self.p, self.m)
        random.shuffle(self.junkpile)
    
    def get_junk(self, count):
        n = self.i + count
        j = self.junkpile[self.i:n]
        if n >= 1000:
            self.update_junkpile()
            n -= 1000
            j += self.junkpile[0:n]
        self.i = n 
        assert(len(j) == count)
        return j

# This function, given a pile of junk to add in and the source
# with which to replenish it
def ice_line(junk_source, line, m):
    words = line.split()
    w_index = len(words)
    safeSpan = False
    while (w_index):
        w_index -= 1
        if (random.random() > (1 / (1 << m))):
            if safeSpan:
                words[w_index] = f"<span class='{get_span_class(True)}'>" + words[w_index]
                safeSpan = False
            words[w_index] += f"<span class='{get_span_class(False)}'>" + junk_source.get_junk(1)[0] + "</span>"
        elif random.random() > (1 / (1 << m)):
            words[w_index] += "</span>"
            safeSpan = True
    if safeSpan:
        words[0] = f"<span class='{get_span_class(True)}'>" + words[0]
    return "<p>" + " ".join(words) + "</p>"
        
    

# This function is the most important - it reads in a file or path
# at *fname* and outputs a version with random junk hidden in "span"
# tags or class 'a', 'e', 'i', anor 'o'; the original text is occasionally put
# in "span" tags with class 't', 'n', 's', or 'c'.
# The intensity of the junk is given by *m*; the permillage of it
# coming from spam files is given by p
def ice(fname, m, p):
    # Retrieve list of random words
    junksource = JunkSource(m, p, "google-10000-english.txt")

    with open(fname, "r", encoding="utf-8") as f:
        with open(fname.split(".")[0] + ".ice", "w", encoding="utf-8") as out:
            s = f.readline()[:-1]
            while (s):
                o = ice_line(junksource, s, m)
                print(clean(o))
                out.write(o)
                s = f.readline()

if __name__ == "__main__":
    m = 1
    p = 0
    n = len(sys.argv)
    if (n < 2):
        raise "Need filename to ice"
    while(n):
        if (sys.argv[n - 1] == "-m"):
            m = int(sys.argv[n])
        elif (sys.argv[n - 1] == "-p"):
            p = int(sys.argv[n])
        n -= 1
    m = 1 if len(sys.argv) < 3 else int(sys.argv[2])
    p = 0 if len(sys.argv) < 4 else int(sys.argv[2])
    ice(sys.argv[1], m, p)
