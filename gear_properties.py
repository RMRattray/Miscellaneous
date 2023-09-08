# Gear property window - a small Tkinter project

import tkinter as tk
from tkinter import ttk
from tkinter import simpledialog
from tkinter import font as tkFont

DECIMAL_PLACES = 4
    
def sfloat(string): # Nifty way to convert strings to floats, acknowledging fractions
    def isfloatchar(char):
        return char in "1234567890./ "
    string = string.lstrip().rstrip()
    if string == "" or string != "".join(filter(isfloatchar, string)):
        return 1 # Blank strings - or strings that aren't pure floats - are returned as "1",
        # which minimized interference in calculation and does not cause glitching.
        # Owing to the later code, all values are re-stated (as rounded decimals), so if the
        # user inputs such a string, it will be apparent that it is being treated as "1".
    if "/" in string:
        [numerator, denominator] = string.split("/")
        if numerator.count(".") > 1: # In case of fractions, acknowledge decimal fractions, but not too many decimal points
            numerator = 1
        else:
            numerator = float(numerator)
        if denominator != "" and denominator.count(".") != 1:
            denominator = float(denominator)
        else:
            denominator = 1
    else:
        if string.count(".") > 1:
            numerator = 1
        else:
            numerator = float(string)
        denominator = 1
    return numerator / denominator

# The gear class holds a gear's properties and the formulas for calculating some
# based on others.  Gear objects also have a set of tkinter StringVars which can
# be tied to text boxes for modification of these properties.
class Gear():
    def __init__(self, window):
        self.window = window # Used so I can produce a dialog box

        self.metric = 1 # A Boolean indicating whether or not the gear needs represent itself in metric units
        self.no_teeth = 6 # Number of teeth
        self.m = 1 # Module (usually represented in millimeters, the pitch diameter over the number of teeth)
        self.dp = 1 # Diametral pitch (arguably in inverse inches, it's the number of teeth over the pitch diameter)
        self.d = 6 # Pitch diameter (diameter of meshing circle)
        self.od = 8 # Outer diameter (diameter of circle around teeth, it's the pitch diameter plus twice the module)
        self.id = 3.5 # Inner diameter

        self.w = 0 # Rotation speed (radians per second)
        self.v = 0 # Linear speed at point of meshing (equal to above times pitch radius)
        self.t = 0 # Torque transmitted ( is force times pitch radius )
        self.f = 0 # Force applied ( is unknown except by torque and radius )
        self.p = 0 # Power transferred to neighboring gear ( is torque times radial speed )

        self.partner = 0 # Neighboring gear, to be a Gear object later

        # String variables for connection to text box
        self.n_str = tk.StringVar()
        self.mp_str = tk.StringVar()
        self.d_str = tk.StringVar()
        self.od_str = tk.StringVar()
        self.id_str = tk.StringVar()

        self.w_str = tk.StringVar()
        self.v_str = tk.StringVar()
        self.t_str = tk.StringVar()
        self.f_str = tk.StringVar()
        self.p_str = tk.StringVar()
    
    # This function updates a the properties of a gear based on a change to the property given by the property argument.
    # The propagate argument determines whether recalculations should be performed on the meshing gear - which is true
    # the first time the function is called (on the updated gear) and false on the meshing gear (which should not ask the
    # first gear to recalculate.)
    # Expected values to the property argument are "no_teeth", "p_o_m" (for pitch/module), "od", "id", and single letter names
    def calculate(self, property, propagate=False):

        # Changing each property requires a different set of calculations, but those sets overlap, as in the following subfunctions
        # Changes to properties could affect different variables in different ways.  In the below calculations, some variables
        # are prioritized as not changing, such as number of teeth (which remains constant so that it can remain an integer),
        # and rotation rate (which is often fixed by a motor)

        def calc_diams(): # Calculates the inner and outer diameters, whenever the pitch diameter (or module) is updated
            self.od = self.d + 2 * self.m # Or the number of teeth, which can also change those parameters
            self.id = self.d - 2.5 * self.m

        def calc_speeds(): # Calculates the linear speed at edge, torque, and power whenever the pitch diameter is updated
            self.v = self.w * self.d / 2 # In such cases, it is rotation speed that is presumed to be the same, and linear speed changed
            if self.metric: # Force also remains the same, rather than torque, such that other gears are not affected.
                self.t = self.f * self.d / 2000 # In metric units, torque is in N-m, not N-mm
            else:
                self.t = self.f * self.d / 24 # In Imperial units, torque is in lb-ft, not lb-in
            calc_power_from_speed()

        def calc_force(): # Calculates force whenever torque is updated (which it is when power is updated, to keep rotation rate the same)
            if self.metric:
                self.f = self.t * 2000 / self.d # In metric, going from N-m to N with diameter in millimeters
            else:
                self.f = 24 * self.t / self.d # In imperial, going from lb-ft to lb with diameter in inches

        def calc_power_from_speed(): # Recalculates power whenever speed is updated, not affecting torque
            self.p = self.w * self.t # Power is the product of rotation rate and torque
            if not self.metric: # If not in metric, must be converted from lb-ft/s to horsepower
                self.p /= 550

        def update_partner(): # Updates the gear's partner's properties.  Only possible if propagate is True.
            self.partner.mp_str.set(self.mp_str.get()) # Two meshing gears must have the same pitch/module
            self.partner.calculate("p_o_m")
            self.partner.v_str.set(self.v_str.get()) # And the same linear speed
            self.partner.calculate("v")
            self.partner.f_str.set(self.f_str.get()) # And applying them the same force will effect the same power
            self.partner.calculate("f")
            self.partner.display()

        if property == "no_teeth": # Update properties based on number of teeth
            if sfloat(self.n_str.get()) == 0:
                return
            self.no_teeth = sfloat(self.n_str.get())
            if simpledialog.SimpleDialog(self.window, text="Which should remain constant?", buttons=["Pitch/Module","Pitch diameter",]).go():
                # If pitch diameter is to remain constant
                self.m = self.d / self.no_teeth
                self.dp = self.no_teeth / self.d
            else:
                # If pitch and module are to remain constant
                if self.metric:
                    self.d = self.no_teeth * self.m
                else:
                    self.d = self.no_teeth / self.dp
            calc_diams(); calc_speeds()

        elif property == "p_o_m": # Update properties based on pitch or module
            if sfloat(self.mp_str.get()) == 0:
                return
            if self.metric: # Number of teeth will remain the same to keep it an integer
                self.m = sfloat(self.mp_str.get())
                self.dp = 1 / self.m
            else:
                self.dp = sfloat(self.mp_str.get())
                self.m = 1 / self.dp
            self.d = self.no_teeth * self.m
            calc_diams(); calc_speeds()

        elif property == "d": # Update properties based on diameter.  Number of teeth will remain constant
            if sfloat(self.d_str.get()) == 0:
                return
            self.d = sfloat(self.d_str.get())
            self.m = self.d / self.no_teeth
            self.dp = 1 / self.m
            calc_diams(); calc_speeds()

        elif property == "od": # Update properties based on outer diameter.
            if sfloat(self.od_str.get()) == 0:
                return
            self.od = sfloat(self.od_str.get())
            self.m = self.od / (2 + self.no_teeth)
            self.dp = 1 / self.m 
            self.d = self.no_teeth * self.m 
            self.id = self.d - 2.25 * self.m
            calc_speeds() 

        elif property == "id": # Update properties based on inner diameter.
            if sfloat(self.id_str.get()) == 0:
                return
            self.id = sfloat(self.id_str.get())
            self.m = self.id / (self.no_teeth - 2.5)
            self.dp = 1 / self.m 
            self.d = self.no_teeth * self.m 
            self.od = self.d + 2 * self.m
            calc_speeds()

        elif property == "w": # Update properties based on rotation rate (rad/s)
            self.w = sfloat(self.w_str.get())
            self.v = self.w * self.d / 2
            calc_power_from_speed()

        elif property == "v": # Update properties based on linear speed
            self.v = sfloat(self.v_str.get())
            self.w = self.v * 2 / self.d 
            calc_power_from_speed()

        elif property == "p": # Update properties based on power
            self.p = sfloat(self.p_str.get())
            if (self.w == 0 and self.t == 0): # If rotation rate and torque are not input, unsure which to update
                pass
            elif self.w == 0: # If rotation speed is not known, and torque is, find it
                if self.metric:
                    self.w = self.p / self.t
                else:
                    self.w = (self.p * 550) / self.t # In imperial units, take power from horsepower to lb-ft/s, divide by lb-ft
                self.v = self.w * self.d / 2
            else:  # Or, if both rotation speed and torque are given, keep rotation speed the same
                self.t = self.p / self.w
            calc_force() # Update force based on torque

        elif property == "f": # Update properties based on force
            self.f = sfloat(self.f_str.get())
            if self.metric:
                self.t = self.f * self.d / 2000 # Torque is force times radius
            else:
                self.t = self.f * self.d / 24 # If imperial, convert from lb-in to lb-ft
            calc_power_from_speed() # When updating force, assume same rotation rate, update power

        elif property == "t": # Update properties based on torque
            self.t = sfloat(self.t_str.get())
            calc_force()
            calc_power_from_speed() # Again, assume same rotation rate, update power
        self.display()
        if propagate: update_partner()
    
    # Show all variable values in text boxes
    def display(self):
        self.n_str.set(int(self.no_teeth))
        if self.metric:
            self.mp_str.set(round(self.m, DECIMAL_PLACES))
        else:
            self.mp_str.set(round(self.dp, DECIMAL_PLACES))
        for i in range(8):
            [self.d_str, self.id_str, self.od_str, self.w_str, self.v_str, self.t_str, self.f_str, self.p_str][i].set(round([self.d, self.id, self.od, self.w, self.v, self.t, self.f, self.p][i], DECIMAL_PLACES))    

class GearWindow(tk.Tk):
    def __init__(self):
        super().__init__()
        # The window holds the program, and thus holds both gear objects
        self.title("Gear Mesh Properties")
        self.gear = Gear(self)
        self.pinion = Gear(self)
        self.gear.partner = self.pinion
        self.pinion.partner = self.gear
        self.gear.display()
        self.pinion.display()

        # Window is composed of three label frames - Units, Geometry, and Motion
        masterframe = ttk.Frame(self, padding=12)
        masterframe.pack()
        unitframe = tk.LabelFrame(masterframe, text="Units")
        geometryframe = tk.LabelFrame(masterframe, text="Geometry")
        motionframe = tk.LabelFrame(masterframe, text="Motion")
        unitframe.pack(expand=True, fill='x', padx=6, pady=6)
        geometryframe.pack(expand=True, fill='x', padx=6, pady=6)
        motionframe.pack(expand=True, fill='x', padx=6, pady=6)
        geargeoframe = ttk.Frame(geometryframe, padding=5)
        pinigeoframe = ttk.Frame(geometryframe, padding=5)
        geometryframe.columnconfigure(0, weight=1)
        geometryframe.columnconfigure(1, weight=1)
        geargeoframe.grid(column=0, row=0)
        pinigeoframe.grid(column=1, row=0)
        gearmoframe = ttk.Frame(motionframe, padding=5)
        pinimoframe = ttk.Frame(motionframe, padding=5)
        gearmoframe.grid(column=0, row=0)
        pinimoframe.grid(column=1, row=0, sticky=tk.N)

        HEADING_FONT = tkFont.nametofont("TkHeadingFont")
        HEADING_FONT.configure(underline=True)

        # Entries are attached to gear properties
                # Various entries exist, attached to most gear properties.  These will be placed below.
        self.entries = [
            ttk.Entry(geargeoframe, textvariable=self.gear.mp_str),
            ttk.Entry(geargeoframe, textvariable=self.gear.n_str),
            ttk.Entry(geargeoframe, textvariable=self.gear.d_str),
            ttk.Entry(geargeoframe, textvariable=self.gear.od_str),
            ttk.Entry(geargeoframe, textvariable=self.gear.id_str),
            ttk.Entry(pinigeoframe, textvariable=self.pinion.mp_str),
            ttk.Entry(pinigeoframe, textvariable=self.pinion.n_str),
            ttk.Entry(pinigeoframe, textvariable=self.pinion.d_str),
            ttk.Entry(pinigeoframe, textvariable=self.pinion.od_str),
            ttk.Entry(pinigeoframe, textvariable=self.pinion.id_str),

            ttk.Entry(gearmoframe, textvariable=self.gear.w_str),
            ttk.Entry(gearmoframe, textvariable=self.gear.v_str),
            ttk.Entry(gearmoframe, textvariable=self.gear.t_str),
            ttk.Entry(gearmoframe, textvariable=self.gear.f_str),
            ttk.Entry(gearmoframe, textvariable=self.gear.p_str),
            ttk.Entry(pinimoframe, textvariable=self.pinion.w_str),
            ttk.Entry(pinimoframe, textvariable=self.pinion.v_str),
            ttk.Entry(pinimoframe, textvariable=self.pinion.t_str),
        ]

        # The units frame consists of a label and a combobox
        ttk.Label(unitframe, text="System of measurement:").grid(column=0, row=0, padx=5)
        self.units = tk.StringVar() # Units can be inches or metric; unit_box is the box that allows one to switch between them
        self.unit_box = ttk.Combobox(unitframe, textvariable=self.units, values=("Imperial","Metric"), state="readonly")
        self.unit_box.grid(column=1,row=0,pady=5, padx=5)
        self.unit_box.set("Metric")

        # The geometry frame contains two headers and a pair of sets of three columns:  labels of gear properties, entries, and unit labels.
        ttk.Label(geargeoframe, text="Gear", font="TkHeadingFont").grid(column=0, row=0, sticky=tk.W)
        ttk.Label(pinigeoframe, text="Pinion", font="TkHeadingFont").grid(column=0, row=0, sticky=tk.W)
        # One pair of property labels is dynamic, changing from pitch to module as units switch
        self.dprop_labels = [ttk.Label(geargeoframe, text="Module:"), ttk.Label(pinigeoframe, text="Module:")]
        for i in range(2):
            self.dprop_labels[i].grid(column = 0, row=1, sticky=tk.E)
            self.entries[i * 5].grid(column=1, row=1, pady=3)
        # Other property labels are static
        stat_prop_list = ["No. of teeth:", "Pitch diameter:", "Inner diameter:", "Outer diameter:"]
        for i in range(len(stat_prop_list)):
            ttk.Label(geargeoframe, text=stat_prop_list[i]).grid(column=0, row = 2 + i, sticky=tk.E)
            ttk.Label(pinigeoframe, text=stat_prop_list[i]).grid(column=0, row = 2 + i, sticky=tk.E)
            self.entries[i + 1].grid(column=1, row= 2 + i, pady=3)
            self.entries[i + 6].grid(column=1, row= 2 + i, pady=3)
        # Unit labels are dynamic.  Number of teeth has no label
        self.unit_labels = [ttk.Label(geargeoframe, text="mm"), ttk.Label(pinigeoframe, text="mm")]
        for i in range(2):
            self.unit_labels[i].grid(column = 2, row=1, sticky=tk.W)
        for i in range(3, len(stat_prop_list) + 2):
            self.unit_labels.append(ttk.Label(geargeoframe, text="mm"))
            self.unit_labels.append(ttk.Label(pinigeoframe, text="mm"))
            for j in range(1,3):
                self.unit_labels[-j].grid(column = 2, row = i, sticky=tk.W)
        
        # The motion frame is similar to the geometry frame, though some properties do not appear on both sides
        stat_prop_list = ["Rotation speed:", "Speed at mesh:", "Torque:"]
        for i in range(len(stat_prop_list)):
            ttk.Label(gearmoframe, text=stat_prop_list[i]).grid(column=0, row = i, sticky=tk.E)
            ttk.Label(pinimoframe, text=stat_prop_list[i]).grid(column=0, row = i, sticky=tk.E)
        ttk.Label(gearmoframe, text="Force at contact:").grid(column=0, row=len(stat_prop_list), sticky=tk.E)
        ttk.Label(gearmoframe, text="Power transmission:").grid(column=0, row=len(stat_prop_list)+1, sticky=tk.E)
        special_metric_units = ["rad/s", "mm/s", "N-m", "N", "W"]
        special_imperial_units = ["rad/s", "in/s", "lb-ft", "lbs", "hp"]
        self.special_unit_labels = []
        for i in range(len(special_metric_units)):
            self.special_unit_labels.append(ttk.Label(gearmoframe, text=special_metric_units[i]))
            self.special_unit_labels[-1].grid(column=2, row = i, sticky=tk.W)
            self.entries[i + 10].grid(column=1, row=i, pady=3)
            if i < 3:
                self.special_unit_labels.append(ttk.Label(pinimoframe, text=special_metric_units[i]))
                self.special_unit_labels[-1].grid(column=2, row = i, sticky=tk.W)
                self.entries[i + 15].grid(column=1, row=i, pady=3)
        
        # Rendering the window functional
        # First, tie entries to calculations
        property_args = ["p_o_m","no_teeth","d","od","id"]
        for i in range(5):
            self.entries[i].bind("<Return>", lambda event, p = property_args[i % 5]: self.gear.calculate(p, True))
            self.entries[i + 5].bind("<Return>", lambda event, p = property_args[i % 5]: self.pinion.calculate(p, True))
        property_args = ["w","v","t"]
        for i in range(3):
            self.entries[10 + i].bind("<Return>", lambda event, p = property_args[i]: self.gear.calculate(p, True))
            self.entries[15 + i].bind("<Return>", lambda event, p = property_args[i]: self.pinion.calculate(p, True))
        self.entries[-5].bind("<Return>", lambda event: self.gear.calculate("f", True))
        self.entries[-4].bind("<Return>", lambda event: self.gear.calculate("p", True))

        # The role of the unit frame's combobox is determined by the function below
        def unit_swap(e):
            if self.unit_box.current(): # This part, when changing to metric,
                for each in self.dprop_labels:
                    each.config(text="Module:")
                for each in self.unit_labels:
                    each.config(text="mm")
                for each in self.special_unit_labels:
                    each.config(text=special_metric_units[special_imperial_units.index(each['text'])])
                for gear in [self.gear, self.pinion]:
                    gear.metric = True
                    gear.d *= 25.4; gear.id *= 25.4; gear.od *= 25.4; gear.m *= 25.4; gear.v *= 25.4 # Convert in, in/s to mm
                    gear.f_str.set(str(gear.f*4.45)) # Convert lb to N, calculate from new force to get other values
            else:                       # And this part, when changing to inches
                for each in self.dprop_labels:
                    each.config(text="Diam. pitch:")
                for each in self.unit_labels:
                    each.config(text="in.")
                self.unit_labels[0].config(text="/in."); self.unit_labels[1].config(text="/in.")
                for each in self.special_unit_labels:
                    each.config(text=special_imperial_units[special_metric_units.index(each['text'])])
                for gear in [self.gear, self.pinion]:
                    gear.metric = False
                    gear.d /= 25.4; gear.id /= 25.4; gear.od /= 25.4; gear.m /= 25.4; gear.v /= 25.4
                    gear.f_str.set(str(gear.f*4.45))
            for gear in [self.gear, self.pinion]:
                gear.calculate("f")
                gear.dp = 1 / gear.m
                gear.display()
        self.unit_box.bind("<<ComboboxSelected>>", unit_swap)

root = GearWindow()
root.mainloop()
