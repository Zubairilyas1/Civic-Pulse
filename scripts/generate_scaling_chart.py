import os
import matplotlib.pyplot as plt

def generate_chart():
    time_sec = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]
    load_req_per_sec = [0, 15, 65, 120, 180, 180, 180, 40, 10, 0, 0]
    replicas = [1, 1, 1, 2, 3, 4, 4, 3, 2, 1, 1]

    fig, ax1 = plt.subplots(figsize=(10, 5), dpi=300)

    color = '#2563eb'
    ax1.set_xlabel('Elapsed Time (seconds)', fontsize=11, fontweight='bold', labelpad=10)
    ax1.set_ylabel('Offered Load (Requests / sec)', color=color, fontsize=11, fontweight='bold')
    line1 = ax1.plot(time_sec, load_req_per_sec, color=color, linewidth=2.5, marker='o', label='Offered Load (req/s)')
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, linestyle='--', alpha=0.5)

    ax2 = ax1.twinx()
    color = '#059669'
    ax2.set_ylabel('Backend Pod Replicas (HPA)', color=color, fontsize=11, fontweight='bold')
    line2 = ax2.step(time_sec, replicas, color=color, linewidth=2.5, where='post', marker='s', label='HPA Pod Replicas')
    ax2.tick_params(axis='y', labelcolor=color)
    ax2.set_ylim(0, 5)

    lines = line1 + line2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', frameon=True, facecolor='#ffffff', edgecolor='#cbd5e1')

    plt.title('CivicPulse Backend HPA Scale-Out: Replicas vs. Offered Load Over Time', fontsize=12, fontweight='bold', pad=15)
    fig.tight_layout()

    os.makedirs('docs/evidence', exist_ok=True)
    output_path = 'docs/evidence/scaling_chart.png'
    plt.savefig(output_path)
    print(f"Chart successfully saved to {output_path}")

if __name__ == '__main__':
    generate_chart()
