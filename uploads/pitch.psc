#This script collects all Pitch files in a directory, and converts them to f0_ascii format
#You need to have  pitch2f0_ascii.exe in your Praat directory
#Edit your path! 

cur_path$ = ""

Create Strings as file list... list 'cur_path$'*.Pitch
numberOfFiles = Get number of strings

# Go through all the sound files, one by one:

for ifile to numberOfFiles
	filename$ = Get string... ifile
	#use tier number 1
                system_nocheck pitch2f0_ascii 'cur_path$''filename$'
                select Strings list
	# and go on with the next pitch file!
endfor






