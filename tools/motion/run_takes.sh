set -e
cd "$(dirname "$0")"
go() { name=$1; shift; python3 -u tools/render.py --port 5176 --noencode "$@" > renders/log_$name.txt 2>&1; rm -rf renders/frames_$name; mv renders/frames renders/frames_$name; mv renders/audio.wav renders/audio_$name.wav; cp renders/meta.json renders/meta_$name.json; echo "done $name $(cat renders/meta_$name.json)"; }
go clean --extra '&clean'
go montage --beat gap_0 --extra '&takes=montage'
go flower --beat gap_0 --extra '&takes=flower'
