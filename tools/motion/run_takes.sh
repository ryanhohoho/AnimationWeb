set -e
cd "$(dirname "$0")"
# bash run_takes.sh              every render the page is cut from
# bash run_takes.sh sky flower   only those
go() { name=$1; shift; python3 -u tools/render.py --port 5176 --noencode "$@" > renders/log_$name.txt 2>&1; rm -rf renders/frames_$name; mv renders/frames renders/frames_$name; mv renders/audio.wav renders/audio_$name.wav; cp renders/meta.json renders/meta_$name.json; echo "done $name $(cat renders/meta_$name.json)"; }
ALL="$*"
has() { [ -z "$ALL" ] || [[ " $ALL " == *" $1 "* ]]; }
has clean   && go clean --extra '&clean'
has montage && go montage --beat gap_0 --extra '&takes=montage'
has flower  && go flower --beat gap_0 --extra '&takes=flower'
has sky     && go sky --beat gap_0 --extra '&takes=sky'
true
